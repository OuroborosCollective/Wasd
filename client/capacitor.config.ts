import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.ouroboros.arelorian",
  appName: "Arelorian Alpha",
  webDir: "dist",
  bundledWebDir: "dist",
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  server: {
    androidScheme: "https",
    hostname: "localhost"
  },
  plugins: {
    StatusBar: {
      style: "dark" as any,
      overlay: false,
      color: "#0f0f1a"
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchFadeOutDuration: 300,
      backgroundColor: "#0f0f1a"
    }
  }
};

export default config;
