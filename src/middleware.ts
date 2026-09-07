import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (token) {
      // 0. Ban Enforcement: If user is marked banned, redirect to /banned
      if (token.isBanned && !path.startsWith("/banned") && !path.startsWith("/api")) {
        const url = req.nextUrl.clone();
        url.pathname = "/banned";
        return NextResponse.redirect(url);
      }

      // 1. Onboarding Gate: If student has not selected a college, force /onboarding
      if (
        !token.collegeId &&
        !path.startsWith("/onboarding") &&
        !path.startsWith("/api") &&
        !path.startsWith("/login") &&
        !path.startsWith("/banned")
      ) {
        const url = req.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      // If user already has a college and tries to visit /onboarding, redirect to home
      if (token.collegeId && path === "/onboarding") {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }

      // 2. Granular Admin Route Access Control
      if (path.startsWith("/admin")) {
        const role = token.role as string;

        // Print hub requires PRINT_MANAGER or SUPER_ADMIN
        if (path.startsWith("/admin/print")) {
          if (role !== "PRINT_MANAGER" && role !== "SUPER_ADMIN") {
            const url = req.nextUrl.clone();
            url.pathname = "/";
            return NextResponse.redirect(url);
          }
        }
        // College and User Management requires SUPER_ADMIN
        else if (
          path.startsWith("/admin/colleges") ||
          path.startsWith("/admin/users") ||
          path === "/admin"
        ) {
          if (role !== "SUPER_ADMIN") {
            const url = req.nextUrl.clone();
            url.pathname = role === "PRINT_MANAGER" ? "/admin/print" : "/";
            return NextResponse.redirect(url);
          }
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (token) return true;
        const hasSessionCookie =
          req.cookies.get("__Secure-next-auth.session-token")?.value ||
          req.cookies.get("next-auth.session-token")?.value ||
          req.cookies.get("otium_token")?.value;
        return !!hasSessionCookie;
      },
    },
    secret:
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "otium-super-secret-key-production-jwt",
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/marketplace/:path*",
    "/messages/:path*",
    "/admin/:path*",
    "/incognito/:path*",
    "/gigs/:path*",
    "/lost-and-found/:path*",
    "/rideshare/:path*",
    "/profile/:path*",
    "/print-station/:path*",
    "/onboarding",
  ],
};
