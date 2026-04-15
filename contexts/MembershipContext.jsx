import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { getRevenueCatCustomerInfo } from "../lib/revenuecat";

const MembershipContext = createContext(null);

export function MembershipProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    isMember: false,
    isAdmin: false,
    isHeadAdmin: false,
    role: "user",
    profile: null,
    customerInfo: null,
    error: null,
  });

  const refreshMembership = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setState((prev) => ({ ...prev, loading: true }));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const nextState = {
          loading: false,
          isMember: false,
          isAdmin: false,
          isHeadAdmin: false,
          role: "user",
          profile: null,
          customerInfo: null,
          error: null,
        };
        setState(nextState);
        return nextState;
      }

      let isMember = false;
      let isAdmin = false;
      let isHeadAdmin = false;
      let role = "user";
      let profile = null;
      let customerInfo = null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, is_admin, admin_role")
        .eq("id", user.id)
        .maybeSingle();

      profile = profileData || null;
      role = profileData?.admin_role || "user";

      isAdmin =
        !!profileData?.is_admin ||
        profileData?.admin_role === "admin" ||
        profileData?.admin_role === "head_admin";

      isHeadAdmin = profileData?.admin_role === "head_admin";

      try {
        customerInfo = await getRevenueCatCustomerInfo(user.id);
        const entitlementActive =
          !!customerInfo?.entitlements?.active &&
          Object.keys(customerInfo.entitlements.active).length > 0;

        if (entitlementActive) {
          isMember = true;
        } else {
          const { data: membershipData } = await supabase
            .from("memberships")
            .select("status")
            .eq("user_id", user.id)
            .maybeSingle();

          isMember = membershipData?.status === "active";
        }
      } catch (rcError) {
        const { data: membershipData } = await supabase
          .from("memberships")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();

        isMember = membershipData?.status === "active";
      }

      const finalIsMember = isAdmin || isMember;

      const nextState = {
        loading: false,
        isMember: finalIsMember,
        isAdmin,
        isHeadAdmin,
        role,
        profile,
        customerInfo,
        error: null,
      };

      setState(nextState);
      return nextState;
    } catch (error) {
      const nextState = {
        loading: false,
        isMember: false,
        isAdmin: false,
        isHeadAdmin: false,
        role: "user",
        profile: null,
        customerInfo: null,
        error,
      };
      setState(nextState);
      return nextState;
    }
  }, []);

  useEffect(() => {
    refreshMembership();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshMembership({ silent: true });
    });

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshMembership({ silent: true });
      }
    });

    return () => {
      subscription?.unsubscribe?.();
      appStateSub?.remove?.();
    };
  }, [refreshMembership]);

  return (
    <MembershipContext.Provider value={{ ...state, refreshMembership }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error("useMembership must be used within MembershipProvider");
  }
  return context;
}
