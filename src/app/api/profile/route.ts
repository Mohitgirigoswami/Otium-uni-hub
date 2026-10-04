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
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const userId = auth.user.id;

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
        walletBalancePaise: user.walletBalancePaise,
        walletBalanceRupees: (user.walletBalancePaise || 0) / 100,
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
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const body = await req.json();

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

    if (body.anonymousAlias !== undefined) {
      const cleanAlias = String(body.anonymousAlias).trim().replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
      if (cleanAlias.length > 0) {
        if (!/^[a-zA-Z0-9_]{3,25}$/.test(cleanAlias)) {
          return NextResponse.json(
            {
              success: false,
              error: "Anonymous alias must be 3-25 characters containing only letters, numbers, or underscores.",
            },
            { status: 400 }
          );
        }
        const existingProfile = await prisma.incognitoProfile.findUnique({
          where: { handle: cleanAlias },
        });
        if (existingProfile && existingProfile.userId !== userId) {
          return NextResponse.json(
            {
              success: false,
              error: `The anonymous alias "@${cleanAlias}" is already taken. Please choose another alias.`,
            },
            { status: 400 }
          );
        }
        const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(cleanAlias)}`;
        await prisma.incognitoProfile.upsert({
          where: { userId },
          create: {
            userId,
            handle: cleanAlias,
            avatarUrl,
          },
          update: {
            handle: cleanAlias,
            avatarUrl,
          },
        });
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
      data: {
        ...updatedUser,
        walletBalancePaise: updatedUser.walletBalancePaise,
        walletBalanceRupees: (updatedUser.walletBalancePaise || 0) / 100,
      },
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
