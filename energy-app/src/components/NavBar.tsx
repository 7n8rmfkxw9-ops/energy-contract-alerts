"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/readings", label: "Relevés" },
  { href: "/contracts", label: "Tarifs" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
      <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-3 sm:px-8">
        <Link href="/" className="shrink-0">
          <Logo
            size={28}
            className="text-white"
            wordmarkClassName="text-base text-white"
          />
        </Link>
        <div className="flex gap-1 text-sm">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
