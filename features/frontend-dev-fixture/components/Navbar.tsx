"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/todos", label: "할 일" },
  { href: "/profile", label: "프로필" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" data-testid="navbar">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold text-zinc-900 dark:text-zinc-50" data-testid="nav-logo">
            TestApp
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                }`}
                data-testid={`nav-${link.href.slice(1)}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="hamburger-menu"
            aria-label="메뉴 열기"
          >
            <svg className="h-6 w-6 text-zinc-900 dark:text-zinc-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden dark:border-zinc-800 dark:bg-zinc-950" data-testid="mobile-menu">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2 text-sm font-medium ${
                  pathname === link.href ? "text-blue-600" : "text-zinc-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <Breadcrumbs pathname={pathname} />
    </>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const labels: Record<string, string> = {
    dashboard: "대시보드",
    todos: "할 일",
    profile: "프로필",
    login: "로그인",
    signup: "회원가입",
    "error-demo": "에러 데모",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-2 text-sm text-zinc-500" data-testid="breadcrumbs">
      <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-50">홈</Link>
      {segments.map((seg, i) => (
        <span key={seg}>
          <span className="mx-1">/</span>
          {i === segments.length - 1 ? (
            <span className="text-zinc-900 dark:text-zinc-50">{labels[seg] || seg}</span>
          ) : (
            <Link href={`/${segments.slice(0, i + 1).join("/")}`} className="hover:text-zinc-900">
              {labels[seg] || seg}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
