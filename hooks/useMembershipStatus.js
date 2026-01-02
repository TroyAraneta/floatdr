import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function useMembershipStatus() {
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMembership = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsMember(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("memberships")
        .select("status, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Membership check failed:", error);
        setIsMember(false);
      } else if (!data) {
        setIsMember(false);
      } else {
        const isActive =
          data.status === "active" &&
          (!data.expires_at || new Date(data.expires_at) > new Date());

        setIsMember(isActive);
      }

      setLoading(false);
    };

    checkMembership();
  }, []);

  return { isMember, loading };
}
