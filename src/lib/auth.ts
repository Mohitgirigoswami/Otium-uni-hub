import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "otium-super-secret-key-production-jwt",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "STUDENT";
        token.collegeId = (user as any).collegeId || null;
      }

      // If user ID is in token, verify/sync from database
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { incognitoProfile: true },
          });

          if (dbUser) {
            token.role = dbUser.role;
            token.collegeId = dbUser.collegeId || null;
            token.isBanned = dbUser.isBanned || false;

            // Auto-provision incognito profile if not present
            if (!dbUser.incognitoProfile) {
              const cleanName = (dbUser.name || "Student").replace(/[^a-zA-Z0-9]/g, "");
              const randomSuffix = Math.floor(1000 + Math.random() * 9000);
              const autoHandle = `Anon_${cleanName}_${randomSuffix}`;
              const autoAvatar = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(autoHandle)}`;

              await prisma.incognitoProfile.create({
                data: {
                  userId: dbUser.id,
                  handle: autoHandle,
                  avatarUrl: autoAvatar,
                },
              });
            }
          }
        } catch (err) {
          console.error("Error syncing user data in JWT callback:", err);
        }
      }

      // Handle explicit session update triggers (e.g. from update() on client)
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.picture) token.picture = session.picture;
        if (session.collegeId !== undefined) token.collegeId = session.collegeId;
        if (session.role) token.role = session.role;
        if (session.isBanned !== undefined) token.isBanned = session.isBanned;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = (token.role as any) || "STUDENT";
        session.user.collegeId = (token.collegeId as string | null) || null;
        (session.user as any).isBanned = (token.isBanned as boolean) || false;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      try {
        const cleanName = (user.name || "Student").replace(/[^a-zA-Z0-9]/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const autoHandle = `Anon_${cleanName}_${randomSuffix}`;
        const autoAvatar = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(autoHandle)}`;

        await prisma.incognitoProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            handle: autoHandle,
            avatarUrl: autoAvatar,
          },
          update: {},
        });
      } catch (e) {
        console.error("Error creating incognito profile on user creation:", e);
      }
    },
  },
};
