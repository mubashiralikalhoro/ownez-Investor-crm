import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { getSession } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OwnEZ CRM",
  description: "OwnEZ Capital Investor Pipeline",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isLoggedIn = !!session;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {isLoggedIn ? (
          <div className="flex min-h-screen">
            <main className="md:ml-[180px] flex-1 min-h-screen pb-16 md:pb-0">
              {children}
            </main>
            <Sidebar />
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
