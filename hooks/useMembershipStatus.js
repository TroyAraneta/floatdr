import { useMembership } from "../contexts/MembershipContext";

export default function useMembershipStatus() {
  const {
    isMember,
    isAdmin,
    isHeadAdmin,
    role,
    loading,
    error,
    customerInfo,
    refreshMembership,
  } = useMembership();

  return {
    isSubscribed: isMember,
    subscriptionLoading: loading,
    customerInfo,
    refreshSubscription: refreshMembership,
    error,
    isMember,
    isAdmin,
    isHeadAdmin,
    role,
    loading,
    refresh: refreshMembership,
  };
}
