import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "VoltWatch — Energy Contract Alerts",
  description: "Pilotage des contrats d'électricité et de gaz (Belgique)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={manrope.variable}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
