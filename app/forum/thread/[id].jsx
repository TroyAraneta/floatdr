import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyThreadRedirect() {
  const { id } = useLocalSearchParams();

  return <Redirect href={{ pathname: "/forum/thread", params: { id } }} />;
}
