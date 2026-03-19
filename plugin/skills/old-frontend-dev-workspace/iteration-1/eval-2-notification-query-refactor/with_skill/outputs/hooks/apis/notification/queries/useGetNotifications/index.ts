"use client";

import { useQuery } from "@tanstack/react-query";

/** 알림 데이터 응답 타입 */
interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsResponse {
  notifications: Notification[];
}

/** useGetNotifications 파라미터 */
interface UseGetNotificationsParams {
  enabled?: boolean;
}

/* ── query key ── */
const notificationKeys = {
  all: ["notifications"] as const,
};

/* ── endpoint ── */
const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await fetch("/api/notifications");

  if (!response.ok) {
    throw new Error("알림을 불러올 수 없습니다");
  }

  const data: NotificationsResponse = await response.json();
  return data.notifications;
};

/**
 * 알림 목록을 조회하는 API 훅 (query)
 * @param params - 알림 조회 파라미터
 * @param params.enabled - 쿼리 활성화 여부 (기본값: true)
 * @returns 알림 데이터, 로딩 상태, 에러 정보
 */
const useGetNotifications = (params: UseGetNotificationsParams = {}) => {
  const { enabled = true } = params;

  const query = useQuery<Notification[]>({
    queryKey: notificationKeys.all,
    queryFn: fetchNotifications,
    enabled,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
};

export default useGetNotifications;
