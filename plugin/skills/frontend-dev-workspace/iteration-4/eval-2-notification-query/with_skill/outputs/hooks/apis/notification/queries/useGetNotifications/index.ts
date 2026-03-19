import { useQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsResponse {
  notifications: Notification[];
}

const useGetNotifications = () => {
  return useQuery<NotificationsResponse>({
    queryKey: ["notification", "useGetNotifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("알림을 불러올 수 없습니다");
      return res.json();
    },
  });
};

export default useGetNotifications;
