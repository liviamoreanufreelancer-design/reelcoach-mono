import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.reelcoach.app",
  appName: "Reel Coach",
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
    contentInset: "never",
    allowsLinkPreview: false,
    scrollEnabled: true,
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
      backgroundColor: "#5B34FF",
      showSpinner: false,
      spinnerColor: "#FFFFFF",
      androidScaleType: "CENTER_INSIDE",
      resizeMode: "contain",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
  },
};

export default config;
