import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  configureRevenueCat,
  getActiveEntitlementId,
  getRevenueCatCustomerInfo,
} from "../lib/revenuecat";

export default function useMembershipStatus() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [error, setError] = useState(null);

  const computeActive = (row) => {
    if (!row) return false;
    const active = row.status === "active";
    if (!active) return false;
    if (!row.expires_at) return true;
    return new Date(row.expires_at) > new Date();
  };

  const computeEntitlementActive = useCallback((info) => {
    const activeEntitlements = info?.entitlements?.active || {};
    const entitlementId = getActiveEntitlementId();

    if (!entitlementId) return false;
    return !!activeEntitlements[entitlementId];
  }, []);

  const refreshSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;

      if (!user) {
        setIsSubscribed(false);
        setCustomerInfo(null);
        return false;
      }

      try {
        await configureRevenueCat(user.id);
        const info = await getRevenueCatCustomerInfo(user.id);

        let isMember = false;

        // 1. Admin override from profiles
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("is_admin, admin_role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) {
          console.error("Profile admin check failed:", profileErr);
        }

        const isAdminOverride =
          !!profile?.is_admin ||
          profile?.admin_role === "admin" ||
          profile?.admin_role === "head_admin";

        if (isAdminOverride) {
          isMember = true;
        }

        // 2. RevenueCat entitlement
        if (!isMember) {
          const rcActive = computeEntitlementActive(info);
          if (rcActive) {
            isMember = true;
          }
        }

        // 3. Supabase memberships fallback/manual membership
        if (!isMember) {
          const { data: membership, error: membershipErr } = await supabase
            .from("memberships")
            .select("status, expires_at")
            .eq("user_id", user.id)
            .maybeSingle();

          if (membershipErr) {
            console.error("Membership fallback check failed:", membershipErr);
          } else if (computeActive(membership)) {
            isMember = true;
          }
        }

        setIsSubscribed(isMember);
        setCustomerInfo(info || null);
        return isMember;
      } catch (rcErr) {
        console.error("RevenueCat subscription check failed:", rcErr);
        setError(rcErr);

        // Fallback to profiles + memberships if RC fails
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("is_admin, admin_role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) {
          console.error("Profile admin fallback check failed:", profileErr);
        }

        const isAdminOverride =
          !!profile?.is_admin ||
          profile?.admin_role === "admin" ||
          profile?.admin_role === "head_admin";

        if (isAdminOverride) {
          setIsSubscribed(true);
          return true;
        }

        const { data: membership, error: membershipErr } = await supabase
          .from("memberships")
          .select("status, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipErr) {
          console.error("Membership fallback check failed:", membershipErr);
          setIsSubscribed(false);
          return false;
        }

        const active = computeActive(membership);
        setIsSubscribed(active);
        return active;
      }
    } catch (err) {
      console.error("Subscription refresh failed:", err);
      setError(err);
      setIsSubscribed(false);
      setCustomerInfo(null);
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  }, [computeEntitlementActive]);

  useEffect(() => {
    refreshSubscription();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshSubscription();
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [refreshSubscription]);

  return {
    isSubscribed,
    subscriptionLoading,
    customerInfo,
    refreshSubscription,
    error,
    isMember: isSubscribed,
    loading: subscriptionLoading,
    refresh: refreshSubscription,
  };
}