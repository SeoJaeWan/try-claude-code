"use client";

import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent");
    if (!accepted) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem("cookie-consent", "true");
    setVisible(false);
  };

  return (
    <div
      data-testid="cookie-banner"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30"
    >
      <div className="w-full border-t bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            이 웹사이트는 쿠키를 사용합니다. 계속 이용하시려면 동의해주세요.
          </p>
          <button
            onClick={accept}
            data-testid="cookie-accept"
            className="shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            동의
          </button>
        </div>
      </div>
    </div>
  );
}
