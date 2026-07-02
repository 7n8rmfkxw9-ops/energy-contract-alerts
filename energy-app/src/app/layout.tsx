import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Energy Contract Alerts",
  description: "Pilotage des contrats d'électricité et de gaz (Belgique)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl gap-6 px-8 py-3 text-sm">
            <Link href="/" className="font-medium">
              Tableau de bord
            </Link>
            <Link href="/readings" className="text-slate-600 hover:underline">
              Relevés
            </Link>
            <Link href="/contracts" className="text-slate-600 hover:underline">
              Tarifs
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
