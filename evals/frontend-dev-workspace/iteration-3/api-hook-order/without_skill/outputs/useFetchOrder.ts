"use client";

import { useState, useEffect, useCallback } from "react";

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  totalAmount: number;
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

/**
 * 주문 데이터를 query 방식으로 가져오는 API 훅.
 *
 * @param params.orderId - 조회할 주문 ID
 * @param params.enabled - 자동 fetch 활성화 여부 (기본값: true)
 * @returns { data, isLoading, isError, error, refetch }
 *
 * @example
 * ```tsx
 * const { data: order, isLoading, isError, error, refetch } = useFetchOrder({
 *   orderId: "order-123",
 * });
 * ```
 */
export function useFetchOrder({
  orderId,
  enabled = true,
}: UseFetchOrderParams): UseFetchOrderResult {
  const [data, setData] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`);

      if (!response.ok) {
        throw new Error(
          `주문 조회에 실패했습니다 (status: ${response.status})`
        );
      }

      const json = await response.json();
      setData(json.order ?? json);
    } catch (err) {
      const fetchError =
        err instanceof Error
          ? err
          : new Error("알 수 없는 오류가 발생했습니다");
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

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchOrder,
  };
}
