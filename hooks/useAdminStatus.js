import { useMembership } from "../contexts/MembershipContext";

export default function useAdminStatus() {
  const { role, isAdmin, isHeadAdmin, loading, error, refreshMembership } =
    useMembership();

  return {
    role,
    isAdmin,
    isHeadAdmin,
    loading,
    error: error?.message || error || null,
    refetch: refreshMembership,
  };
}
