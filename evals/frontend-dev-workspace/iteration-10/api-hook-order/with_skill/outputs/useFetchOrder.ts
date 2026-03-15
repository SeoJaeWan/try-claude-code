"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  FetchOrderParams,
  Order,
  UseFetchOrderReturn,
} from "./types";

async function fetchOrder(orderId: string): Promise<Order> {
  const response = await fetch(`/api/orders/${orderId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`);
  }

  const data: Order = await response.json();
  return data;
}

export function useFetchOrder({
  orderId,
  enabled = true,
}: FetchOrderParams): UseFetchOrderReturn {
  const [data, setData] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    if (!orderId) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const order = await fetchOrder(orderId);

      if (!controller.signal.aborted) {
        setData(order);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const fetchError =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setIsError(true);
        setError(fetchError);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    if (!enabled || !orderId) {
      return;
    }

    refetch();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [enabled, orderId, refetch]);

  return { data, isLoading, isError, error, refetch };
}
