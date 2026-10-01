import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/utils/auth";
import { encode } from "next-auth/jwt";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXTAUTH_GOOGLE_ID ||
  process.env.AUTH_GOOGLE_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, credential, accessToken, email: directEmail, name: directName, picture: directPicture } = body;

    let payload: {
      email?: string;
      name?: string;
      picture?: string;
      sub?: string;
    } | null = null;

    const tokenToVerify = idToken || credential;

    // 1. If accessToken provided, fetch directly from Google userinfo API
    if (accessToken && typeof accessToken === "string") {
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userInfoRes.ok) {
          const googleUser = await userInfoRes.json();
          if (googleUser.email) {
            payload = {
              email: googleUser.email,
              name: googleUser.name || googleUser.email.split("@")[0],
              picture: googleUser.picture,
              sub: googleUser.sub,
            };
          }
        }
      } catch (userInfoErr) {
        console.warn("Could not fetch userinfo via Google accessToken:", userInfoErr);
      }
    }

    // 2. If idToken is a real Google JWT, verify with Google OAuth2Client or tokeninfo endpoint
    if (!payload && tokenToVerify && typeof tokenToVerify === "string") {
      // Check if it's a real 3-part base64 JWT
      if (tokenToVerify.split(".").length === 3) {
        try {
          const allowedAudiences = [
            process.env.GOOGLE_CLIENT_ID,
            process.env.AUTH_GOOGLE_ID,
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            process.env.GOOGLE_ANDROID_CLIENT_ID,
            process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
            process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            "182612765129-k94groidumjmdmb68s32a534sfqtoe10.apps.googleusercontent.com",
            "182612765129-2kh8jfrrn176cscsnkdmqvoduema0p7p.apps.googleusercontent.com",
          ].filter(Boolean) as string[];

          if (allowedAudiences.length > 0) {
            const ticket = await googleClient.verifyIdToken({
              idToken: tokenToVerify,
              audience: allowedAudiences,
            });
            payload = ticket.getPayload() || null;
          }
        } catch (verifyErr) {
          console.warn("OAuth2Client verify error, checking tokeninfo endpoint:", verifyErr);
        }

        // Fallback: Google public tokeninfo endpoint
        if (!payload) {
          try {
            const verifyRes = await fetch(
              `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`
            );
            if (verifyRes.ok) {
              const info = await verifyRes.json();
              if (info.email) {
                payload = {
                  email: info.email,
                  name: info.name || info.email.split("@")[0],
                  picture: info.picture,
                  sub: info.sub,
                };
              }
            }
          } catch (tokenInfoErr) {
            console.warn("Google tokeninfo error:", tokenInfoErr);
          }
        }
      }
    }

    // SECURITY REMEDIATION [C3]: Reject unverified tokens. Cryptographic signature must be verified.
    if (!payload || !payload.email) {
      return NextResponse.json(
        { success: false, error: "Invalid or unverified Google token. Cryptographic authentication failed." },
        { status: 401 }
      );
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split("@")[0];
    const picture = payload.picture || null;

    // 4. Domain Check & Campus Assignment (Do NOT auto-assign random campus)
    const allowedColleges = await prisma.college.findMany();
    let userCollegeId: string | null = null;
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (emailDomain) {
      const matched = allowedColleges.find((c) => {
        const cDomain = (c as any).domain?.toLowerCase();
        if (cDomain && emailDomain.includes(cDomain)) return true;
        const cCode = (c as any).code?.toLowerCase();
        if (cCode && emailDomain.includes(cCode)) return true;
        return false;
      });
      if (matched) {
        userCollegeId = matched.id;
      }
    }

    // 5. Upsert User in Prisma
    let user = await prisma.user.upsert({
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

    // 6. Guard against banned accounts
    if (user.isBanned) {
      return NextResponse.json(
        {
          success: false,
          error: `Your account is suspended: ${user.banReason || "Policy violation"}`,
        },
        { status: 403 }
      );
    }

    // Ensure public username exists
    if (!user.username) {
      const baseName = (user.name || email.split("@")[0] || "student")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 14);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const autoUsername = `${baseName || "student"}_${randomSuffix}`;
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { username: autoUsername },
          include: {
            college: {
              select: { id: true, name: true, city: true },
            },
          },
        });
      } catch {}
    }

    // Ensure incognitoProfile exists for whisper wall
    const existingIncognito = await prisma.incognitoProfile.findUnique({
      where: { userId: user.id },
    });
    if (!existingIncognito) {
      const cleanName = (user.name || "Student").replace(/[^a-zA-Z0-9]/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const autoHandle = `Anon_${cleanName}_${randomSuffix}`;
      const autoAvatar = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(autoHandle)}`;
      await prisma.incognitoProfile.create({
        data: {
          userId: user.id,
          handle: autoHandle,
          avatarUrl: autoAvatar,
        },
      });
    }

    // 7. Issue Custom 30-Day JWT for mobile / client API
    const token = signToken({
      userId: user.id,
      email: user.email || undefined,
      role: user.role,
      name: user.name || undefined,
    });

    // 8. Generate NextAuth Encrypted Session Token
    const nextAuthSecret =
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "otium-super-secret-key-production-jwt";

    const nextAuthSessionToken = await encode({
      token: {
        id: user.id,
        name: user.name,
        username: user.username || null,
        email: user.email,
        picture: user.image,
        role: user.role,
        collegeId: user.collegeId,
        isBanned: user.isBanned || false,
        sub: user.id,
      },
      secret: nextAuthSecret,
      maxAge: 30 * 24 * 60 * 60,
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username || null,
        email: user.email,
        role: user.role,
        image: user.image,
        phone: user.phone,
        collegeId: user.collegeId,
        college: user.college,
      },
      message: "Google authentication successful.",
    });

    const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    const isHttps =
      req.nextUrl.protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https" ||
      isProd;

    const cookieMaxAge = 30 * 24 * 60 * 60; // 30 days
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: isHttps,
      maxAge: cookieMaxAge,
    };

    response.cookies.set("next-auth.session-token", nextAuthSessionToken, cookieOptions);
    if (isHttps) {
      response.cookies.set("__Secure-next-auth.session-token", nextAuthSessionToken, cookieOptions);
    }
    response.cookies.set("otium_token", token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error("[POST /api/auth/google Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Google authentication failed." },
      { status: 500 }
    );
  }
}
