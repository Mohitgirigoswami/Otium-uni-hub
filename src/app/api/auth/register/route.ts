import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, collegeId, department, year } = body;

    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";

    if (!normalizedEmail || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Name and university email are required." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    let validCollegeId = collegeId;
    if (!validCollegeId) {
      const defaultCollege = await prisma.college.findFirst();
      validCollegeId = defaultCollege?.id;
    }

    // Create student user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).replace(/\D/g, "").slice(-10) : undefined,
        department: department?.trim(),
        year: year ? Number(year) : undefined,
        collegeId: validCollegeId,
        role: "STUDENT",
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    // Generate JWT
    const token = signToken({
      userId: newUser.id,
      email: newUser.email || undefined,
      role: newUser.role,
      name: newUser.name || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          collegeId: newUser.collegeId,
          college: newUser.college,
        },
        message: "Account registered successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/auth/register Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Registration failed." },
      { status: 500 }
    );
  }
}
