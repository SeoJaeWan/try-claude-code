"use client";

import { useState, useEffect, useCallback } from "react";

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

interface UseFetchOrderParams {
  orderId: string | undefined;
  enabled?: boolean;
}

interface UseFetchOrderResult {
  data: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFetchOrder({
  orderId,
  enabled = true,
}: UseFetchOrderParams): UseFetchOrderResult {
  const [data, setData] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`);

      if (!response.ok) {
        throw new Error(`주문 조회 실패: ${response.status} ${response.statusText}`);
      }

      const order: Order = await response.json();
      setData(order);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error("알 수 없는 오류가 발생했습니다");
      setError(fetchError);
      setIsError(true);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (enabled && orderId) {
      fetchOrder();
    }
  }, [enabled, orderId, fetchOrder]);

  return { data, isLoading, isError, error, refetch: fetchOrder };
}
