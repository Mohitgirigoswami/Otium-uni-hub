import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/utils/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const userId = auth.authenticated && auth.user ? auth.user.id : searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication or User ID required." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        college: true,
        incognitoProfile: true,
        _count: {
          select: {
            printOrders: true,
            subjects: true,
            cgpaSemesters: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        image: user.image,
        bio: user.bio,
        phone: user.phone,
        department: user.department,
        year: user.year,
        role: user.role,
        collegeId: user.collegeId,
        college: user.college,
        incognitoProfile: user.incognitoProfile,
        stats: {
          printOrders: user._count.printOrders,
          attendanceSubjects: user._count.subjects,
          savedSemesters: user._count.cgpaSemesters,
        },
      },
    });
  } catch (error: any) {
    console.error("[GET /api/profile Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const body = await req.json();

    const userId = auth.authenticated && auth.user ? auth.user.id : body.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return NextResponse.json({ success: false, error: rateCheck.error }, { status: 429 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.bio !== undefined) updateData.bio = String(body.bio).trim();
    if (body.phone !== undefined) updateData.phone = String(body.phone).trim();
    if (body.department !== undefined) updateData.department = String(body.department).trim();
    if (body.year !== undefined) updateData.year = Number(body.year);
    if (body.collegeId !== undefined) updateData.collegeId = body.collegeId;

    if (body.username !== undefined) {
      const cleanUsername = String(body.username).trim().toLowerCase().replace(/^@/, "");
      if (cleanUsername.length > 0) {
        if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
          return NextResponse.json(
            {
              success: false,
              error: "Username must be 3-20 characters containing only letters, numbers, and underscores.",
            },
            { status: 400 }
          );
        }
        const existing = await prisma.user.findFirst({
          where: {
            username: cleanUsername,
            id: { not: userId },
          },
        });
        if (existing) {
          return NextResponse.json(
            {
              success: false,
              error: `The handle @${cleanUsername} is already claimed. Pick another username!`,
            },
            { status: 400 }
          );
        }
        updateData.username = cleanUsername;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        college: true,
        incognitoProfile: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error: any) {
    console.error("[PATCH /api/profile Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
