import { NextResponse } from "next/server";

export async function GET() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const notifications = [
    {
      id: "1",
      message: "새로운 할 일이 추가되었습니다",
      time: new Date().toISOString(),
      read: false,
    },
    {
      id: "2",
      message: "할 일을 완료했습니다",
      time: new Date(Date.now() - 3600000).toISOString(),
      read: true,
    },
    {
      id: "3",
      message: "프로필이 업데이트되었습니다",
      time: new Date(Date.now() - 86400000).toISOString(),
      read: true,
    },
  ];

  return NextResponse.json({ notifications, total: notifications.length });
}
