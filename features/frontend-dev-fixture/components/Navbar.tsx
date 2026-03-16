"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/todos", label: "할 일" },
  { href: "/profile", label: "프로필" },
];

export default function Navbar() {
  const { isAuthenticated, user, logout, mounted } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!mounted) return <nav className="h-14 border-b border-zinc-200 dark:border-zinc-800" />;

  return (
    <>
      <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" data-testid="navbar">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold text-zinc-900 dark:text-zinc-50" data-testid="nav-logo">
            TestApp
          </Link>

          {isAuthenticated ? (
            <>
              {/* Desktop nav */}
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
                <span className="text-sm text-zinc-500" data-testid="nav-user-email">{user?.email}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                  data-testid="nav-logout"
                >
                  로그아웃
                </button>
              </div>

              {/* Mobile hamburger */}
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
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400" data-testid="nav-login">
                로그인
              </Link>
              <Link href="/signup" className="text-sm font-medium text-blue-600 hover:text-blue-800" data-testid="nav-signup">
                회원가입
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {menuOpen && isAuthenticated && (
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
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="block w-full py-2 text-left text-sm text-red-600"
              data-testid="mobile-logout"
            >
              로그아웃
            </button>
          </div>
        )}
      </nav>

      {/* Breadcrumbs */}
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
