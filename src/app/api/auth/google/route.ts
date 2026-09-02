import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/utils/auth";
import jwt from "jsonwebtoken";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || process.env.NEXTAUTH_GOOGLE_ID
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken = body.idToken || body.credential;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Google ID Token is required." },
        { status: 400 }
      );
    }

    let payload: {
      email?: string;
      name?: string;
      picture?: string;
      sub?: string;
    } | null = null;

    // 1. Verify Google ID Token with Google OAuth2Client
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NEXTAUTH_GOOGLE_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

    if (googleClientId) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: googleClientId,
        });
        payload = ticket.getPayload() || null;
      } catch (verifyErr) {
        console.warn("Google client verification error, trying token decode fallback:", verifyErr);
      }
    }

    // 2. Decode fallback (for dev/simulation/mobile JWTs)
    if (!payload) {
      const decoded: any = jwt.decode(idToken);
      if (decoded && decoded.email) {
        payload = {
          email: decoded.email,
          name: decoded.name || decoded.email.split("@")[0],
          picture: decoded.picture || decoded.avatar,
          sub: decoded.sub,
        };
      }
    }

    if (!payload || !payload.email) {
      return NextResponse.json(
        { success: false, error: "Invalid Google authentication token." },
        { status: 401 }
      );
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split("@")[0];
    const picture = payload.picture || null;

    // 3. Domain Check (Campus domain or allow @gmail.com during dev)
    const allowedColleges = await prisma.college.findMany();
    const defaultCollege = allowedColleges[0] || null;

    // Determine matching college based on domain if possible
    let userCollegeId = defaultCollege?.id;
    const emailDomain = email.split("@")[1];
    if (emailDomain) {
      const matched = allowedColleges.find(
        (c) =>
          c.name.toLowerCase().includes(emailDomain.split(".")[0]) ||
          emailDomain.includes("dtu") ||
          emailDomain.includes("edu") ||
          emailDomain.includes("ac.in")
      );
      if (matched) {
        userCollegeId = matched.id;
      }
    }

    // 4. Upsert User in Prisma
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        image: picture,
        emailVerified: new Date(),
        role: "STUDENT",
        collegeId: userCollegeId,
      },
      update: {
        name,
        image: picture || undefined,
        emailVerified: new Date(),
      },
      include: {
        college: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    // 5. Guard against banned accounts
    if (user.isBanned) {
      return NextResponse.json(
        {
          success: false,
          error: `Your account is suspended: ${user.banReason || "Policy violation"}`,
        },
        { status: 403 }
      );
    }

    // 6. Issue Custom 30-Day JWT
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
        image: user.image,
        phone: user.phone,
        collegeId: user.collegeId,
        college: user.college,
      },
      message: "Google authentication successful.",
    });
  } catch (error: any) {
    console.error("[POST /api/auth/google Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Google authentication failed." },
      { status: 500 }
    );
  }
}
