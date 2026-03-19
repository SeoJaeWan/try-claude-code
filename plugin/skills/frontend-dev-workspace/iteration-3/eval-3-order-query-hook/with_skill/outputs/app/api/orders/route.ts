import { NextResponse } from "next/server";
import type { Order } from "@/lib/types";

const mockOrders: Order[] = [
  {
    id: "order-1",
    status: "completed",
    totalAmount: 50000,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "order-2",
    status: "pending",
    totalAmount: 120000,
    createdAt: "2026-03-10T00:00:00Z",
    updatedAt: "2026-03-10T00:00:00Z",
  },
];

export async function GET() {
  return NextResponse.json(mockOrders[0]);
}
