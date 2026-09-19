import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Mobile REST API: GET /api/users?search=...
 * Allows authenticated students to discover campus classmates to message
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const fallbackUserId = searchParams.get("userId")?.trim() || "";
    const currentUserId = auth.authenticated && auth.user ? auth.user.id : fallbackUserId;

    const rawQuery = searchParams.get("search")?.trim() || "";
    const cleanQuery = rawQuery.replace(/^@/, "");
    const collegeParam = searchParams.get("collegeId")?.trim() || "";
    const userCollegeId = auth.user?.collegeId || collegeParam || null;

    // Search query conditions - strictly search by Name, Public Username, or Department.
    // NEVER search by or leak student email addresses!
    const orConditions = cleanQuery
      ? [
          { name: { contains: cleanQuery, mode: "insensitive" as const } },
          { username: { contains: cleanQuery, mode: "insensitive" as const } },
          { department: { contains: cleanQuery, mode: "insensitive" as const } },
        ]
      : undefined;

    // 1. First attempt: search within user's college if collegeId exists
    let where: any = {
      isBanned: false,
    };

    if (currentUserId) {
      where.id = { not: currentUserId };
    }

    if (userCollegeId) {
      where.collegeId = userCollegeId;
    }

    if (orConditions) {
      where.OR = orConditions;
    }

    let users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        department: true,
        year: true,
        college: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 25,
      orderBy: { name: "asc" },
    });

    // 2. If fewer than 2 results and query was provided, expand search campus-wide
    if (users.length === 0 && userCollegeId) {
      const broadWhere: any = {
        id: { not: currentUserId },
        isBanned: false,
      };
      if (orConditions) {
        broadWhere.OR = orConditions;
      }
      users = await prisma.user.findMany({
        where: broadWhere,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          department: true,
          year: true,
          college: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: 25,
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error("[GET /api/users Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
