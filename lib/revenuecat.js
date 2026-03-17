import { Platform } from "react-native";
import Constants from "expo-constants";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

let configured = false;
let currentAppUserId = null;

const extra = Constants.expoConfig?.extra ?? {};
const ACTIVE_ENTITLEMENT_ID =
  extra.REVENUECAT_ACTIVE_ENTITLEMENT_ID || "Float Doctor Pro";

function getApiKey() {
  const iosKey = extra.REVENUECAT_IOS_API_KEY;
  const androidKey = extra.REVENUECAT_ANDROID_API_KEY;
  return Platform.OS === "ios" ? iosKey : androidKey;
}

export async function configureRevenueCat(userId) {
  const normalizedUserId = userId || null;
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn("RevenueCat API key missing");
    return;
  }

  if (!configured) {
    Purchases.setLogLevel(LOG_LEVEL.INFO);

    try {
      await Purchases.configure({
        apiKey,
        appUserID: normalizedUserId,
      });

      configured = true;
      currentAppUserId = normalizedUserId;
    } catch (err) {
      console.error("RevenueCat configure failed:", err?.message || err);
      return;
    }

    return;
  }

  if (currentAppUserId === normalizedUserId) return;

  try {
    if (normalizedUserId) {
      await Purchases.logIn(normalizedUserId);
    } else {
      await Purchases.logOut();
    }
    currentAppUserId = normalizedUserId;
  } catch (err) {
    console.error("RevenueCat user sync failed:", err?.message || err);
  }
}

async function ensureRevenueCatReady(userId) {
  const normalizedUserId = userId || null;

  if (!configured) {
    if (!normalizedUserId) return;
    await configureRevenueCat(normalizedUserId);
    return;
  }

  if (currentAppUserId !== normalizedUserId) {
    await configureRevenueCat(normalizedUserId);
  }
}

export function getActiveEntitlementId() {
  return ACTIVE_ENTITLEMENT_ID;
}

export async function getRevenueCatCustomerInfo(userId) {
  await ensureRevenueCatReady(userId);
  return Purchases.getCustomerInfo();
}

export async function getRevenueCatOfferings(userId) {
  await ensureRevenueCatReady(userId);
  return Purchases.getOfferings();
}

export async function purchaseRevenueCatPackage(pkg, userId) {
  await ensureRevenueCatReady(userId);
  return Purchases.purchasePackage(pkg);
}

export async function restoreRevenueCatPurchases(userId) {
  await ensureRevenueCatReady(userId);
  return Purchases.restorePurchases();
}

export async function presentRevenueCatPaywall(userId) {
  await ensureRevenueCatReady(userId);

  const result = await RevenueCatUI.presentPaywall();

  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
    default:
      return false;
  }
}
