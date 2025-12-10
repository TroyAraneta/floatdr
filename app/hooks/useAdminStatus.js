import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle(); 

      if (error) console.error(error);
      setIsAdmin(data?.is_admin || false);
      setLoading(false);
    };

    fetchAdminStatus();
  }, []);

  return { isAdmin, loading };
}

