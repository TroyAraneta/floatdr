import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const DEFAULT_ROLE = "user";

function normalizeRole(value) {
  if (value === "admin" || value === "head_admin") return value;
  return DEFAULT_ROLE;
}

export default function useAdminStatus() {
  const mountedRef = useRef(true);
  const [role, setRole] = useState(DEFAULT_ROLE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const user = userData?.user;
      if (!user) {
        if (mountedRef.current) setRole(DEFAULT_ROLE);
        return;
      }

      const { data, error: roleErr } = await supabase
        .from("profiles")
        .select("admin_role")
        .eq("id", user.id)
        .single();

      if (roleErr) {
        const shouldFallback =
          roleErr.code === "PGRST204" || /admin_role/i.test(roleErr.message || "");

        if (shouldFallback) {
          const { data: legacyData, error: legacyErr } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

          if (legacyErr) throw legacyErr;

          if (mountedRef.current) {
            setRole(legacyData?.is_admin ? "admin" : DEFAULT_ROLE);
          }
          return;
        }

        throw roleErr;
      }

      if (mountedRef.current) {
        setRole(normalizeRole(data?.admin_role));
      }
    } catch (err) {
      console.error("Admin status check failed:", err);
      if (mountedRef.current) {
        setRole(DEFAULT_ROLE);
        setError(err?.message || "Failed to load admin status.");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStatus]);

  const isAdmin = role === "admin" || role === "head_admin";
  const isHeadAdmin = role === "head_admin";

  return {
    role,
    isAdmin,
    isHeadAdmin,
    loading,
    error,
    refetch: fetchStatus,
  };
}
