"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { SaveSemesterRecordParams } from "./cgpa.types";

/**
 * Fetch all semester records for CGPA tracking
 */
export async function getSemesterRecords(userId: string): Promise<ActionResponse<any[]>> {
  try {
    const records = await prisma.semesterCGPA.findMany({
      where: { userId },
      orderBy: { semester: "asc" },
    });

    const parsed = records.map((r) => ({
      ...r,
      courses: JSON.parse(r.courses || "[]"),
    }));

    return {
      success: true,
      data: parsed,
    };
  } catch (error: any) {
    console.error("Error in getSemesterRecords:", error);
    return {
      error: error?.message || "Failed to load CGPA records.",
      data: [],
    };
  }
}

/**
 * Save or update a semester's grade calculations
 */
export async function saveSemesterRecord(data: SaveSemesterRecordParams): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const existing = await prisma.semesterCGPA.findFirst({
      where: {
        userId: data.userId,
        semester: Number(data.semester),
      },
    });

    const coursesJson = JSON.stringify(data.courses || []);

    let record;
    if (existing) {
      record = await prisma.semesterCGPA.update({
        where: { id: existing.id },
        data: {
          gpa: Number(data.gpa),
          totalCredits: Number(data.totalCredits),
          courses: coursesJson,
        },
      });
    } else {
      record = await prisma.semesterCGPA.create({
        data: {
          userId: data.userId,
          semester: Number(data.semester),
          gpa: Number(data.gpa),
          totalCredits: Number(data.totalCredits),
          courses: coursesJson,
        },
      });
    }

    return {
      success: true,
      data: {
        ...record,
        courses: JSON.parse(record.courses),
      },
    };
  } catch (error: any) {
    console.error("Error in saveSemesterRecord:", error);
    return {
      error: error?.message || "Failed to save semester record.",
    };
  }
}

/**
 * Delete a semester record
 */
export async function deleteSemesterRecord(
  recordId: string,
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    await prisma.semesterCGPA.deleteMany({
      where: {
        id: recordId,
        userId,
      },
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error in deleteSemesterRecord:", error);
    return {
      error: error?.message || "Failed to delete semester record.",
    };
  }
}
