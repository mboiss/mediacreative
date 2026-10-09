import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { AutoClearCache } from "@/components/layout/auto-clear-cache";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Media Creative Control Center",
  description: "Business Management Platform",
  applicationName: "Media Creative",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // iPhone/iPad "Add to Home Screen": open full-screen with the app name.
  appleWebApp: {
    capable: true,
    title: "Media Creative",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e15" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AutoClearCache />
              <PwaRegister />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
