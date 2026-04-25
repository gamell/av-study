import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { DbProvider } from "@/components/db-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { InstallHint } from "@/components/install-hint";
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
  userScalable: false,
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
            <OfflineBanner />
            <InstallHint />
            {children}
          </DbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
