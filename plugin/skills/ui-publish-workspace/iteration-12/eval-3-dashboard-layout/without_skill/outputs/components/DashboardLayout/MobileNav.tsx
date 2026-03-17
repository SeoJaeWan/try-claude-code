"use client";

import Link from "next/link";
import { navLinks } from "./navLinks";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface MobileNavProps {
  currentPath?: string;
}

// ----------------------------------------------------------------
// MobileNav
// ----------------------------------------------------------------

export default function MobileNav({ currentPath = "/dashboard" }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-zinc-200 bg-white md:hidden dark:border-zinc-800 dark:bg-zinc-900"
      data-testid="dashboard-mobile-nav"
    >
      {navLinks.map((link) => {
        const isActive = currentPath === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            data-testid={`mobile-nav-${link.href.slice(1)}`}
          >
            {link.icon}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
