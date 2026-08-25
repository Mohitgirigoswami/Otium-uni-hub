"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getOrCreateCurrentUser } from "@/actions/user.actions";

interface UserContextType {
  user: any | null;
  loading: boolean;
  activePersonaId: string;
  setActivePersonaId: (id: string) => void;
  refreshUser: () => Promise<void>;
  isOnCooldown: boolean;
  cooldownHoursRemaining: number;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  activePersonaId: "usr_aarav_sharma",
  setActivePersonaId: () => {},
  refreshUser: async () => {},
  isOnCooldown: false,
  cooldownHoursRemaining: 0,
});

export const AVAILABLE_PERSONAS = [
  {
    id: "usr_aarav_sharma",
    name: "Aarav Sharma",
    role: "CS Senior (Full-Stack Dev)",
    userRole: "STUDENT",
    year: "3rd Year",
    department: "Computer Science",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "CyberHawk_99",
  },
  {
    id: "usr_priya_patel",
    name: "Priya Patel",
    role: "UI/UX Designer",
    userRole: "STUDENT",
    year: "4th Year",
    department: "Design & Interaction",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "PixelSorceress",
  },
  {
    id: "usr_rohan_verma",
    name: "Rohan Verma",
    role: "Mechanical Enthusiast",
    userRole: "STUDENT",
    year: "2nd Year",
    department: "Mechanical Engg",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "TurboMech_07",
  },
  {
    id: "usr_sneha_reddy",
    name: "Sneha Reddy",
    role: "Data & Biotech Researcher",
    userRole: "STUDENT",
    year: "3rd Year",
    department: "Biotech & Data",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "BioQuantum",
  },
  {
    id: "usr_admin_operator",
    name: "Campus Print Operator (Admin)",
    role: "Campus Ops & Admin",
    userRole: "ADMIN",
    year: "Staff",
    department: "Campus Printing & IT Services",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "AdminConsole",
  },
];

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePersonaId, setActivePersonaId] = useState<string>("usr_aarav_sharma");

  const loadUser = async (targetId?: string) => {
    try {
      setLoading(true);
      const res = await getOrCreateCurrentUser(targetId || activePersonaId);
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (e) {
      console.error("Failed to load user session:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser(activePersonaId);
  }, [activePersonaId]);

  const refreshUser = async () => {
    await loadUser(activePersonaId);
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

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        activePersonaId,
        setActivePersonaId,
        refreshUser,
        isOnCooldown,
        cooldownHoursRemaining,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
