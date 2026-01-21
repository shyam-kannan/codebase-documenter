"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Custom hook to sync NextAuth session with backend.
 * 
 * Automatically sends user data and GitHub token to backend
 * when user logs in via GitHub OAuth.
 */
export function useBackendAuth() {
  const { data: session, status } = useSession();

  useEffect(() => {
    const syncWithBackend = async () => {
      if (status === "authenticated" && session?.accessToken && session?.user?.githubId) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          
          const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              github_id: session.user.githubId,
              username: session.user.username,
              access_token: session.accessToken,
              email: session.user.email,
              name: session.user.name,
              avatar_url: session.user.image,
            }),
          });

          if (!response.ok) {
            console.error("Failed to sync user with backend:", await response.text());
          } else {
            console.log("Successfully synced user with backend");
          }
        } catch (error) {
          console.error("Error syncing with backend:", error);
        }
      }
    };

    syncWithBackend();
  }, [session, status]);

  return { session, status };
}
