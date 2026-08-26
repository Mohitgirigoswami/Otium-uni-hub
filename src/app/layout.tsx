import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { UserProvider } from "@/components/providers/UserContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Otium Uni Hub | University Student Super App",
  description:
    "The all-in-one university Super App: P2P freelance gig hub, attendance guardrail calculator, weighted CGPA tracker, lost & found image directory, airport cab splits, anonymous incognito wall, and student peer marketplace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col mesh-gradient-light dark:mesh-gradient-dark selection:bg-brand-500/30 selection:text-brand-900 dark:selection:text-brand-200">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <SessionProvider>
            <UserProvider>
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
              <Footer />
              <Toaster position="top-right" richColors closeButton theme="system" />
            </UserProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
