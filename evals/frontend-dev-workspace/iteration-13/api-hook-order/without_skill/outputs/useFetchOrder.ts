"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  shippingAddress: string;
}

export interface UseFetchOrderParams {
  orderId: string | undefined;
  enabled?: boolean;
}

export interface UseFetchOrderResult {
  data: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

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
}: UseFetchOrderParams): UseFetchOrderResult {
  const [data, setData] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    if (!orderId) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const order = await fetchOrder(orderId);

      if (!controller.signal.aborted) {
        setData(order);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err : new Error(String(err)));
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

    execute();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [orderId, enabled, execute]);

  const refetch = useCallback(async () => {
    await execute();
  }, [execute]);

  return {
    data,
    isLoading,
    isError: error !== null,
    error,
    refetch,
  };
}
