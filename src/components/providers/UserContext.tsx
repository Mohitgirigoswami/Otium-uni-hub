"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { getUserById, getDevSuperAdminUser } from "@/actions/user.actions";

interface UserContextType {
  user: any | null;
  jwtToken: string | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  isOnCooldown: boolean;
  cooldownHoursRemaining: number;
  handleSignOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  jwtToken: null,
  loading: true,
  refreshUser: async () => {},
  isOnCooldown: false,
  cooldownHoursRemaining: 0,
  handleSignOut: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 0. Instant restore from cached profile for 0ms initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("otium_cached_web_user");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id) {
            setUser(parsed);
            setLoading(false);
          }
        }
      } catch {}
    }
  }, []);

  const loadUser = useCallback(async (userId?: string) => {
    try {
      setLoading(true);

      // 1. Check if we have a stored JWT token in localStorage
      if (typeof window !== "undefined") {
        const storedToken = localStorage.getItem("otium_jwt_token");
        if (storedToken) {
          setJwtToken(storedToken);
          try {
            const meRes = await fetch("/api/auth/me", {
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.success && meData.user) {
                setUser(meData.user);
                sessionStorage.setItem("otium_cached_web_user", JSON.stringify(meData.user));
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn("Failed to verify stored JWT with /api/auth/me:", e);
          }
        }
      }

      // 2. Fallback to NextAuth session ID if present
      const targetId = userId || session?.user?.id;
      if (targetId) {
        const res = await getUserById(targetId);
        if (res.success && res.data) {
          setUser(res.data);
          sessionStorage.setItem("otium_cached_web_user", JSON.stringify(res.data));
          setLoading(false);
          return;
        }
      }

      // 3. Dev environment fallback to Super Admin
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
    await loadUser(session?.user?.id);
  };

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("otium_jwt_token");
      sessionStorage.removeItem("otium_cached_web_user");
    }
    setJwtToken(null);
    setUser(null);
    try {
      await signOut({ callbackUrl: "/login" });
    } catch {
      window.location.href = "/login";
    }
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
        jwtToken,
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
