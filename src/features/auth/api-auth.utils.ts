import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { JwtUserPayload, VerifyAuthResult } from "./auth.types";

const JWT_SECRET = process.env.JWT_SECRET || "otium-jwt-secret-key-campus-2026";

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
 * Extract and verify bearer token from incoming HTTP Request headers.
 * Returns authentication result with Prisma user record if valid.
 */
export async function verifyAuth(request: Request): Promise<VerifyAuthResult> {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        authenticated: false,
        user: null,
        error: "Missing or invalid Authorization header. Format: Bearer <token>",
      };
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return {
        authenticated: false,
        user: null,
        error: "Authentication token is missing.",
      };
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return {
        authenticated: false,
        user: null,
        error: "Invalid or expired authentication token.",
      };
    }

    // Look up fresh user from Prisma database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
    return {
      authenticated: false,
      user: null,
      error: error?.message || "Authentication verification failed.",
    };
  }
}
