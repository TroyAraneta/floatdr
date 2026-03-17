import { useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import SubscriptionModal from "../../components/SubscriptionModal";

export default function SubscriptionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const close = useCallback(() => {
    router.back();
  }, [router]);

  // If you want special behavior when coming from a member gate, keep this hook.
  const closeToMemberGate = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SubscriptionModal
      visible={true}
      onClose={close}
      onCloseToMemberGate={from === "memberGate" ? closeToMemberGate : close}
    />
  );
}