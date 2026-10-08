"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Rendered from the first paint (no "mounted" gate) so the saved theme is applied
// before content shows — avoids a dark→light flash and a full remount of the app.
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
