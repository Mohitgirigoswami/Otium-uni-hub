"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { getUserById, getDevSuperAdminUser } from "@/actions/user.actions";

interface UserContextType {
  user: any | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  isOnCooldown: boolean;
  cooldownHoursRemaining: number;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  isOnCooldown: false,
  cooldownHoursRemaining: 0,
  handleSignOut: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (userId?: string) => {
    try {
      setLoading(true);
      const targetId = userId || session?.user?.id;
      if (targetId) {
        const res = await getUserById(targetId);
        if (res.success && res.data) {
          setUser(res.data);
          setLoading(false);
          return;
        }
      }

      // Dev environment fallback to Super Admin
      if (process.env.NODE_ENV === "development") {
        const devRes = await getDevSuperAdminUser();
        if (devRes.success && devRes.data) {
          setUser(devRes.data);
          setLoading(false);
          return;
        }
      }

      setUser(null);
    } catch (e) {
      console.error("Failed to load user session:", e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
    } else if (session?.user?.id) {
      loadUser(session.user.id);
    } else {
      loadUser();
    }
  }, [session?.user?.id, status, loadUser]);

  const refreshUser = async () => {
    if (session?.user?.id) {
      await loadUser(session.user.id);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // Check cooldown status
  let isOnCooldown = false;
  let cooldownHoursRemaining = 0;

  if (user?.freelancerCooldown) {
    const cooldownEnd = new Date(user.freelancerCooldown).getTime();
    const now = Date.now();
    if (cooldownEnd > now) {
      isOnCooldown = true;
      cooldownHoursRemaining = Math.max(1, Math.ceil((cooldownEnd - now) / (1000 * 60 * 60)));
    }
  }

  // Automatic Ban Guardrail
  useEffect(() => {
    if (user?.isBanned && typeof window !== "undefined") {
      if (!window.location.pathname.startsWith("/banned")) {
        window.location.href = "/banned";
      }
    }
  }, [user?.isBanned]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading: loading || status === "loading",
        refreshUser,
        isOnCooldown,
        cooldownHoursRemaining,
        handleSignOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
