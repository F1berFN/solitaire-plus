import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const GUEST_SESSION_KEY = "solitaire_guest_session";

export interface GuestSession {
  id: number;
  displayName: string;
  discriminator: number;
  fullName: string;
}

/**
 * Hook to manage guest player session.
 * Persists guest ID and name to localStorage.
 * Returns current guest session or null if not a guest.
 */
export function useGuestSession() {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const createOrGetGuest = trpc.guest.getOrCreate.useMutation();

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(GUEST_SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GuestSession;
        setSession(parsed);
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const createGuestSession = async (displayName: string) => {
    setIsLoading(true);
    try {
      const result = await createOrGetGuest.mutateAsync({ displayName });
      const guestSession: GuestSession = {
        id: result.id,
        displayName: result.displayName,
        discriminator: result.discriminator,
        fullName: result.fullName,
      };
      setSession(guestSession);
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guestSession));
      return guestSession;
    } catch (error) {
      console.error("Failed to create guest session:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearGuestSession = () => {
    setSession(null);
    localStorage.removeItem(GUEST_SESSION_KEY);
  };

  return {
    session,
    isLoading,
    createGuestSession,
    clearGuestSession,
  };
}
