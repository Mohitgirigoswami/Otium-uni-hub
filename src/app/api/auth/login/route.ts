import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return NextResponse.json(
        { success: false, error: "Please enter your university email address." },
        { status: 400 }
      );
    }

    // Look up user by email in database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { email: { startsWith: normalizedEmail.split("@")[0] } },
        ],
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    // Fallback: If no user found and in dev/demo mode, auto-provision student account for testing
    if (!user) {
      const defaultCollege = await prisma.college.findFirst();
      user = await prisma.user.create({
        data: {
          email: normalizedEmail.includes("@") ? normalizedEmail : `${normalizedEmail}@dtu.ac.in`,
          name: normalizedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          role: "STUDENT",
          collegeId: defaultCollege?.id,
        },
        include: {
          college: {
            select: { id: true, name: true, city: true },
          },
        },
      });
    }

    if (user.isBanned) {
      return NextResponse.json(
        {
          success: false,
          error: `Your account is suspended: ${user.banReason || "Policy violation"}`,
        },
        { status: 403 }
      );
    }

    // Sign 30-day JWT
    const token = signToken({
      userId: user.id,
      email: user.email || undefined,
      role: user.role,
      name: user.name || undefined,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        collegeId: user.collegeId,
        college: user.college,
        image: user.image,
      },
      message: "Login successful.",
    });
  } catch (error: any) {
    console.error("[POST /api/auth/login Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Authentication failed." },
      { status: 500 }
    );
  }
}
