"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";

/**
 * Fetch all subjects and attendance status for a user
 */
export async function getSubjects(userId: string): Promise<ActionResponse<any[]>> {
  try {
    const subjects = await prisma.subject.findMany({
      where: { userId },
      include: {
        records: {
          orderBy: { date: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: subjects,
    };
  } catch (error: any) {
    console.error("Error in getSubjects:", error);
    return {
      error: error?.message || "Failed to fetch subjects.",
      data: [],
    };
  }
}

/**
 * Add a new subject
 */
export async function createSubject(data: {
  userId: string;
  name: string;
  code?: string;
  totalClasses: number;
  attendedClasses: number;
  periodWeight?: number;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.name?.trim()) return { error: "Subject name is required." };
    if (data.totalClasses < 0 || data.attendedClasses < 0) {
      return { error: "Class numbers must be positive." };
    }
    if (data.attendedClasses > data.totalClasses) {
      return { error: "Attended classes cannot exceed total classes." };
    }

    const subject = await prisma.subject.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim().toUpperCase() || null,
        totalClasses: Number(data.totalClasses),
        attendedClasses: Number(data.attendedClasses),
        periodWeight: Math.max(1, Math.min(Number(data.periodWeight) || 1, 4)),
        userId: data.userId,
      },
    });

    return {
      success: true,
      data: subject,
    };
  } catch (error: any) {
    console.error("Error in createSubject:", error);
    return {
      error: error?.message || "Failed to create subject.",
    };
  }
}

/**
 * Log a class session (Present or Absent)
 */
export async function logAttendanceSession(
  subjectId: string,
  userId: string,
  status: "PRESENT" | "ABSENT",
  count: number = 1
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject || subject.userId !== userId) {
      return { error: "Subject not found or unauthorized." };
    }

    const weight = Math.max(1, Math.min(Number(count) || 1, 5));
    const newTotal = subject.totalClasses + weight;
    const newAttended = status === "PRESENT" ? subject.attendedClasses + weight : subject.attendedClasses;

    const [updatedSubject, record] = await prisma.$transaction([
      prisma.subject.update({
        where: { id: subjectId },
        data: {
          totalClasses: newTotal,
          attendedClasses: newAttended,
        },
      }),
      prisma.attendanceRecord.create({
        data: {
          subjectId,
          status,
          date: new Date(),
        },
      }),
    ]);

    return {
      success: true,
      data: { subject: updatedSubject, record },
    };
  } catch (error: any) {
    console.error("Error in logAttendanceSession:", error);
    return {
      error: error?.message || "Failed to update attendance.",
    };
  }
}

/**
 * Delete a subject
 */
export async function deleteSubject(
  subjectId: string,
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    await prisma.subject.deleteMany({
      where: {
        id: subjectId,
        userId,
      },
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error in deleteSubject:", error);
    return {
      error: error?.message || "Failed to delete subject.",
    };
  }
}

/**
 * Update Subject counts manually
 */
export async function updateSubjectCounts(
  subjectId: string,
  userId: string,
  data: {
    name: string;
    code?: string;
    totalClasses: number;
    attendedClasses: number;
    periodWeight?: number;
  }
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (data.attendedClasses > data.totalClasses) {
      return { error: "Attended classes cannot exceed total classes." };
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: data.name.trim(),
        code: data.code?.trim().toUpperCase() || null,
        totalClasses: Number(data.totalClasses),
        attendedClasses: Number(data.attendedClasses),
        ...(data.periodWeight
          ? { periodWeight: Math.max(1, Math.min(Number(data.periodWeight), 4)) }
          : {}),
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in updateSubjectCounts:", error);
    return {
      error: error?.message || "Failed to update subject.",
    };
  }
}

/**
 * Synchronize offline subjects and lecture updates with the database.
 * Reconciles local counts with server data so offline updates are NEVER lost.
 */
export async function syncOfflineAttendance(
  userId: string,
  clientSubjects: Array<{
    id: string;
    name: string;
    code?: string;
    attended: number;
    total: number;
    periodWeight?: number;
  }>
): Promise<ActionResponse<any[]>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      const existing = await prisma.subject.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return { success: true, data: existing };
    }

    if (!Array.isArray(clientSubjects) || clientSubjects.length === 0) {
      const existing = await prisma.subject.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return { success: true, data: existing };
    }

    // Fetch existing subjects for this user
    const dbSubjects = await prisma.subject.findMany({
      where: { userId },
    });

    const dbMap = new Map(dbSubjects.map((s) => [s.id, s]));
    const nameMap = new Map(dbSubjects.map((s) => [s.name.trim().toLowerCase(), s]));

    for (const clientSub of clientSubjects) {
      if (!clientSub.name?.trim()) continue;

      const clientAttended = Math.max(0, Number(clientSub.attended) || 0);
      const clientTotal = Math.max(clientAttended, Number(clientSub.total) || 0);
      const weight = Math.max(1, Math.min(Number(clientSub.periodWeight) || 1, 4));

      // 1. Match by database ID
      let matched = dbMap.get(clientSub.id);

      // 2. Or match by name for newly registered / seeded demo subjects
      if (!matched) {
        matched = nameMap.get(clientSub.name.trim().toLowerCase());
      }

      if (matched) {
        // Reconcile: promote higher counts from offline attendance
        const finalAttended = Math.max(clientAttended, matched.attendedClasses);
        const finalTotal = Math.max(clientTotal, matched.totalClasses);

        if (finalAttended !== matched.attendedClasses || finalTotal !== matched.totalClasses) {
          await prisma.subject.update({
            where: { id: matched.id },
            data: {
              attendedClasses: finalAttended,
              totalClasses: finalTotal,
              periodWeight: weight,
            },
          });
        }
      } else {
        // Brand new subject created offline or first-time sync
        await prisma.subject.create({
          data: {
            userId,
            name: clientSub.name.trim(),
            code: clientSub.code?.trim().toUpperCase() || "SUB",
            attendedClasses: clientAttended,
            totalClasses: clientTotal,
            periodWeight: weight,
          },
        });
      }
    }

    // Return full up-to-date database list with official Prisma IDs
    const finalSubjects = await prisma.subject.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: finalSubjects,
    };
  } catch (error: any) {
    console.error("Error in syncOfflineAttendance:", error);
    return {
      error: error?.message || "Failed to synchronize offline attendance.",
    };
  }
}

