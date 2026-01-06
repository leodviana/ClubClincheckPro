"use client";

import { useMemo } from "react";
import { useAuthContext } from "@/components/AuthProvider";

export function useAuth() {
  const { status, accessToken, user, signIn, signOut, refreshSession } = useAuthContext();

  const isAuthenticated = useMemo(() => status === "authenticated", [status]);

  return {
    status,
    accessToken,
    user,
    isAuthenticated,
    signIn,
    signOut,
    refreshSession,
  };
}
