import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.reelcoach.app",
  appName: "ReelPilot",
  webDir: "dist-mobile",
  server: {
    androidScheme: "https",
    // Using "capacitor" scheme (not custom "reelpilot") is required for
    // getUserMedia to work in WKWebView on iOS. The "capacitor://" scheme
    // is treated as a secure context by WebKit, enabling camera/mic access.
    iosScheme: "capacitor",
    allowNavigation: [],
  },
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
    scrollEnabled: false,
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    Camera: {
      presentationStyle: "fullscreen",
    },
    Share: {},
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 800,
      backgroundColor: "#0F1419",
      showSpinner: false,
      spinnerColor: "#E8D5B5",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
  },
};

export default config;
