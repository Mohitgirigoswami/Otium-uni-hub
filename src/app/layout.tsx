import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { THEMES } from "@/lib/themes";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { UserProvider } from "@/components/providers/UserContext";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Otium Uni Hub | University Student Platform",
  description:
    "Campus operational platform for students: cloud print dispatch, 75% attendance guardrails, credit-weighted CGPA tracker, freelance micro-gigs, peer marketplace, and anonymous whisper wall.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="cyber-neon"
          themes={THEMES.map((t) => t.id)}
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <SessionProvider>
            <UserProvider>
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {children}
              </main>
              <MobileNav />
              <Footer />
              <CommandPalette />
              <Toaster position="top-right" richColors closeButton />
            </UserProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
