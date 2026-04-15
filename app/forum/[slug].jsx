import { Redirect, useLocalSearchParams } from "expo-router";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}

export default function LegacyForumCategoryRedirect() {
  const params = useLocalSearchParams();
  const slug = normalizeParam(params.slug).trim().toLowerCase();

  return (
    <Redirect
      href={{
        pathname: "/(dashboard)/forum",
        params: slug ? { slug } : undefined,
      }}
    />
  );
}
