import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAdminStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (mounted) {
        if (error) {
          console.error("Admin check failed:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data.is_admin);
        }
        setLoading(false);
      }
    };

    loadAdminStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return { isAdmin, loading };
}
