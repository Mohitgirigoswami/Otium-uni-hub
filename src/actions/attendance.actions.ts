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
  status: "PRESENT" | "ABSENT"
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

    const newTotal = subject.totalClasses + 1;
    const newAttended = status === "PRESENT" ? subject.attendedClasses + 1 : subject.attendedClasses;

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
  data: { name: string; code?: string; totalClasses: number; attendedClasses: number }
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
