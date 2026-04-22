import { createContext, useContext, useState, useEffect } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { api, setTokenGetter } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken, signOut } = useClerkAuth();

  // dbUser = our record from the SkillBridge DB (has role, institution_id, etc.)
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // needsOnboarding = Clerk sign-up done but role not yet synced to our DB
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Wire api.js to use Clerk's getToken so every request includes the right Bearer JWT
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  // When Clerk auth state resolves, check if we have a DB record for this user
  useEffect(() => {
    if (!clerkLoaded) return;

    if (!isSignedIn) {
      setDbUser(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .me()
      .then((u) => {
        setDbUser(u);
        setNeedsOnboarding(false);
      })
      .catch((err) => {
        // "User not synced" means Clerk auth is fine but no DB row yet → onboarding
        if (err.message?.includes("not synced") || err.status === 401) {
          setNeedsOnboarding(true);
          setDbUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  /**
   * Called from the Onboarding page after the user picks a role.
   * POSTs to /api/auth/sync and stores the resulting DB user.
   */
  async function syncUser(role, institutionId = null) {
    const u = await api.syncUser({ role, institution_id: institutionId });
    setDbUser(u);
    setNeedsOnboarding(false);
    return u;
  }

  async function logout() {
    await signOut();
    setDbUser(null);
    setNeedsOnboarding(false);
  }

  return (
    <AuthContext.Provider
      value={{ user: dbUser, loading, needsOnboarding, syncUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

