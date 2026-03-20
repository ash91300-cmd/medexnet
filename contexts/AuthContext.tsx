"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Role = "user" | "admin";
type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

interface UserProfile {
  role: Role;
  verification_status: VerificationStatus;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("role, verification_status, name")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("프로필 조회 실패:", error);
        // 에러 시에도 기본 프로필 세팅 (무한 로딩 방지)
        setProfile({ role: "user", verification_status: "unverified", name: null });
        return;
      }

      setProfile(data as UserProfile);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile({ role: "user", verification_status: "unverified", name: null });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // 1) 초기 세션 확인 — loading은 세션 확인 즉시 해제
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      // 프로필은 백그라운드로 로드 (loading과 무관)
      if (currentUser?.id) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // 2) 세션 변경 감지 (로그인/로그아웃/토큰 갱신)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      if (currentUser?.id) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
