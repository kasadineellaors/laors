import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Hybrid app: native shell loads the production LAORS website.
 * Web deploys on Vercel update the app without a new App Store release.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || "https://www.laorsranch.com";

const config: CapacitorConfig = {
  appId: "com.laorsranch.laors",
  appName: "LAORS",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#f5f0e8",
    scheme: "LAORS",
  },
  android: {
    backgroundColor: "#f5f0e8",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#f5f0e8",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#27425d",
    },
  },
};

export default config;
