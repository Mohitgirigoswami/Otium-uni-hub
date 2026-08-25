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
    year: "3rd Year",
    department: "Computer Science",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "CyberHawk_99",
  },
  {
    id: "usr_priya_patel",
    name: "Priya Patel",
    role: "UI/UX Designer",
    year: "4th Year",
    department: "Design & Interaction",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "PixelSorceress",
  },
  {
    id: "usr_rohan_verma",
    name: "Rohan Verma",
    role: "Mechanical Enthusiast",
    year: "2nd Year",
    department: "Mechanical Engg",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "TurboMech_07",
  },
  {
    id: "usr_sneha_reddy",
    name: "Sneha Reddy",
    role: "Data & Biotech Researcher",
    year: "3rd Year",
    department: "Biotech & Data",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    incognitoHandle: "BioQuantum",
  },
];

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePersonaId, setActivePersonaId] = useState<string>("usr_aarav_sharma");

  const loadUser = async () => {
    try {
      setLoading(true);
      const res = await getOrCreateCurrentUser();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.error("Error loading user in context:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [activePersonaId]);

  // Check cooldown status
  const now = new Date();
  const cooldownDate = user?.freelancerCooldown ? new Date(user.freelancerCooldown) : null;
  const isOnCooldown = !!cooldownDate && cooldownDate > now;
  const cooldownHoursRemaining = isOnCooldown
    ? Math.max(1, Math.ceil((cooldownDate.getTime() - now.getTime()) / (1000 * 60 * 60)))
    : 0;

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        activePersonaId,
        setActivePersonaId,
        refreshUser: loadUser,
        isOnCooldown,
        cooldownHoursRemaining,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
