"use client";

import { useQuery } from "@tanstack/react-query";

/** 알림 데이터 응답 타입 */
interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

/**
 * 알림 목록을 조회하는 API 훅 (query)
 * @returns 알림 데이터, 로딩 상태, 에러 정보
 */
const useGetNotifications = () => {
  const query = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");

      if (!response.ok) {
        throw new Error("알림을 불러올 수 없습니다");
      }

      const data = await response.json();
      return data.notifications;
    },
  });

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
};

export default useGetNotifications;
