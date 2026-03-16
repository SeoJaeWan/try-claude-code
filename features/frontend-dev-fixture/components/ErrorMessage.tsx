"use client";

export default function ErrorMessage({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" data-testid="error-message">
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-4 font-medium hover:text-red-600" data-testid="error-dismiss">
          닫기
        </button>
      )}
    </div>
  );
}
