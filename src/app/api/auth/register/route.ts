import { NextResponse } from "next/server";

/**
 * SECURITY REMEDIATION [C2]: Backdoor endpoint disabled.
 * Passwordless / unverified registration is prohibited. All student registration
 * and authentication must proceed through verified Google OAuth (/api/auth/google) or NextAuth.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Unverified registration is disabled. Please register via Google OAuth.",
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Unverified registration is disabled. Please register via Google OAuth.",
    },
    { status: 403 }
  );
}
