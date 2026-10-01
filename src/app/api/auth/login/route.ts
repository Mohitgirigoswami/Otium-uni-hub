import { NextResponse } from "next/server";

/**
 * SECURITY REMEDIATION [C2]: Backdoor endpoint disabled.
 * Passwordless login is prohibited. All student and admin authentication
 * must proceed through verified Google OAuth (/api/auth/google) or NextAuth session flow.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Passwordless login is disabled. Please authenticate via Google OAuth.",
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Passwordless login is disabled. Please authenticate via Google OAuth.",
    },
    { status: 403 }
  );
}
