"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface Order {
  id: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface UseFetchOrderOptions {
  /** Order ID to fetch. Hook is disabled when this is undefined/empty. */
  orderId: string | undefined;
  /** If true the query will not run automatically. Call `refetch` manually. */
  enabled?: boolean;
}

export interface UseFetchOrderResult {
  /** The fetched order data, or null while loading / on error. */
  data: Order | null;
  /** True while the initial fetch is in-flight. */
  isLoading: boolean;
  /** True while any fetch (initial or refetch) is in-flight. */
  isFetching: boolean;
  /** Error object if the last fetch failed. */
  error: Error | null;
  /** Manually re-trigger the query. */
  refetch: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// Fetcher
// -----------------------------------------------------------------------------

async function fetchOrder(orderId: string): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch order: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<Order>;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Query-style hook that fetches a single order by ID.
 *
 * Features:
 * - Automatic fetching when `orderId` changes
 * - Loading / fetching / error states
 * - `enabled` flag to defer execution
 * - `refetch` function for manual re-query
 * - Stale-closure & race-condition safe via AbortController
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useFetchOrder({ orderId: "abc-123" });
 * ```
 */
export function useFetchOrder({
  orderId,
  enabled = true,
}: UseFetchOrderOptions): UseFetchOrderResult {
  const [data, setData] = useState<Order | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Track whether we've completed at least one successful fetch so we can
  // distinguish "initial load" from "background refetch".
  const hasFetchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    if (!orderId) return;

    // Cancel any in-flight request to avoid race conditions.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!hasFetchedRef.current) {
      setIsLoading(true);
    }
    setIsFetching(true);
    setError(null);

    try {
      const order = await fetchOrder(orderId);

      // Only update state if this request was not aborted.
      if (!controller.signal.aborted) {
        setData(order);
        hasFetchedRef.current = true;
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred"),
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [orderId]);

  // Auto-fetch when orderId or enabled changes.
  useEffect(() => {
    if (!enabled || !orderId) {
      return;
    }

    execute();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [orderId, enabled, execute]);

  // Reset state when orderId changes.
  useEffect(() => {
    setData(null);
    setError(null);
    hasFetchedRef.current = false;
  }, [orderId]);

  const refetch = useCallback(async () => {
    await execute();
  }, [execute]);

  return { data, isLoading, isFetching, error, refetch };
}
