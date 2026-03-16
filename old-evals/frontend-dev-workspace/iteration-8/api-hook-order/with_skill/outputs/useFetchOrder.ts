"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Order,
  UseFetchOrderParams,
  UseFetchOrderReturn,
} from "./types";

export function useFetchOrder({
  orderId,
}: UseFetchOrderParams): UseFetchOrderReturn {
  const [data, setData] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.status}`);
      }

      const order: Order = await response.json();
      setData(order);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const errorInstance =
        err instanceof Error ? err : new Error("Unknown error");
      setIsError(true);
      setError(errorInstance);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchOrder]);

  const refetch = useCallback(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { data, isLoading, isError, error, refetch };
}
