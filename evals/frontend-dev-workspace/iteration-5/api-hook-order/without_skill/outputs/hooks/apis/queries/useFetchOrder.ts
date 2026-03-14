"use client";

import { useState, useEffect, useCallback } from "react";
import type { Order } from "@/lib/types";

interface UseFetchOrderParams {
  orderId: string | null;
  enabled?: boolean;
}

interface UseFetchOrderReturn {
  data: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFetchOrder({
  orderId,
  enabled = true,
}: UseFetchOrderParams): UseFetchOrderReturn {
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
        throw new Error(`Failed to fetch order: ${response.status}`);
      }

      const order: Order = await response.json();
      setData(order);
    } catch (err) {
      const fetchError =
        err instanceof Error ? err : new Error("Unknown error occurred");
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
