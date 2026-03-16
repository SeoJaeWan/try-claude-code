"use client";

import { useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";

export default function ErrorDemoPage() {
  const [throwError, setThrowError] = useState(false);
  const [apiError, setApiError] = useState(false);

  if (throwError) throw new Error("의도적으로 발생시킨 에러입니다");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">에러 상태 데모</h1>
      <p className="mt-2 text-sm text-zinc-500">에러 처리 UI를 테스트할 수 있는 페이지입니다</p>

      <div className="mt-8 space-y-4">
        <button
          onClick={() => setThrowError(true)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          data-testid="trigger-error"
        >
          런타임 에러 발생
        </button>

        <button
          onClick={() => setApiError(true)}
          className="ml-4 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          data-testid="simulate-api-error"
        >
          API 에러 시뮬레이션
        </button>

        {apiError && (
          <ErrorMessage
            message="서버에서 데이터를 불러오는 중 오류가 발생했습니다 (500 Internal Server Error)"
            onDismiss={() => setApiError(false)}
          />
        )}
      </div>
    </div>
  );
}
