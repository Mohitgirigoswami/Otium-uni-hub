import jwt from "jsonwebtoken";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { JwtUserPayload, VerifyAuthResult } from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "otium-jwt-secret-key-campus-2026";

function extractCookie(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Sign a new JWT with 30-day expiration
 */
export function signToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "30d",
  });
}

/**
 * Verify and decode an existing JWT
 */
export function verifyToken(token: string): JwtUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
  } catch {
    return null;
  }
}

/**
 * Extract and verify authorization from incoming HTTP Request.
 * Supports:
 * 1. Mobile Bearer token ("Authorization: Bearer <jwt>")
 * 2. Web otium_token cookie ("Cookie: otium_token=<jwt>")
 * 3. NextAuth session cookie ("next-auth.session-token" / "__Secure-next-auth.session-token")
 * Returns authentication result with Prisma user record if valid.
 */
export async function verifyAuth(request: Request): Promise<VerifyAuthResult> {
  try {
    let token: string | null = null;

    // 1. Try Bearer Authorization header (Mobile & API clients)
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1] || null;
    }

    // 2. Try otium_token cookie (Web browser sessions)
    const cookieHeader = request.headers.get("cookie");
    if (!token && cookieHeader) {
      token = extractCookie(cookieHeader, "otium_token");
    }

    let userId: string | null = null;

    // If token found (either via header or otium_token cookie), decode it
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        userId = decoded.userId;
      }
    }

    // 3. Fallback to NextAuth Session Token in cookies
    if (!userId && cookieHeader) {
      try {
        const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || JWT_SECRET;
        const nextAuthSession = await getToken({
          req: request as any,
          secret: nextAuthSecret,
        });
        if (nextAuthSession) {
          userId =
            (nextAuthSession.sub ||
              (nextAuthSession as any).id ||
              (nextAuthSession as any).userId) as string || null;
        }
      } catch {
        // Silently continue
      }
    }

    if (!userId) {
      return {
        authenticated: false,
        user: null,
        error: "Missing or invalid Authorization header or session cookie.",
      };
    }

    // Look up fresh user from Prisma database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        incognitoProfile: true,
        college: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    if (!user) {
      return {
        authenticated: false,
        user: null,
        error: "Authenticated user no longer exists.",
      };
    }

    if (user.isBanned) {
      return {
        authenticated: false,
        user: null,
        error: `Account suspended: ${user.banReason || "Terms of Service violation"}`,
      };
    }

    return {
      authenticated: true,
      user,
    };
  } catch (error: any) {
    console.error("[verifyAuth Error]:", error);
    const msg = error?.message || "";
    const cleanError =
      msg.includes("connection pool") || msg.includes("timed out") || msg.includes("prisma")
        ? "Campus authentication server is temporarily busy. Please retry in a few seconds."
        : "Authentication verification failed. Please sign in again.";
    return {
      authenticated: false,
      user: null,
      error: cleanError,
    };
  }
}
