import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { DbProvider } from "@/components/db-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflineRouteWarmer } from "@/components/offline-route-warmer";
import { InstallHint } from "@/components/install-hint";
import { NavHeader } from "@/components/nav-header";
import { MobileNav } from "@/components/mobile-nav";
import "./globals.css";

const APP_NAME = "Pilot Study";
const APP_DESCRIPTION =
  "Flashcard study app for the FAA Private Pilot knowledge test and checkride oral exam";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} - Private Pilot Exam Prep`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
  // Belt-and-suspenders: Next emits the modern `mobile-web-app-capable` via
  // `appleWebApp.capable`, but iOS < 16.4 only honors the legacy
  // apple-prefixed name. Emit both so install works back to iOS 12.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Allow pinch-zoom for accessibility; the previous `userScalable: false`
  // blocked zooming on the (often small) FAA reference text.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DbProvider>
            {/*
              Single sticky top stack so the offline banner, install hint, and
              nav header never overlap (they were all `sticky top-0`). `pt-safe`
              fills the notch / Dynamic Island area with the app background.
            */}
            <div className="sticky top-0 z-50 bg-background pt-safe px-safe">
              <OfflineBanner />
              <InstallHint />
              <NavHeader />
            </div>
            <OfflineRouteWarmer />
            <div className="bottom-nav-gap px-safe sm:pb-0">{children}</div>
            <MobileNav />
          </DbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
