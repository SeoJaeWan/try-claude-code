"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Order,
  FetchOrderParams,
  UseFetchOrderResult,
} from "./types";

/**
 * 주문 데이터를 query 방식으로 가져오는 커스텀 훅.
 *
 * - orderId가 변경되면 자동으로 재요청합니다.
 * - enabled 옵션으로 요청을 지연시킬 수 있습니다 (기본값 true).
 * - refetch()를 호출하면 수동으로 재요청할 수 있습니다.
 * - 컴포넌트 언마운트 또는 orderId 변경 시 이전 요청을 abort 합니다.
 */
export function useFetchOrder({
  orderId,
  enabled = true,
}: FetchOrderParams): UseFetchOrderResult {
  const [data, setData] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    // 이전 요청이 있으면 취소
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `주문 조회에 실패했습니다. (status: ${response.status})`
        );
      }

      const order: Order = await response.json();
      setData(order);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // 요청이 취소된 경우 무시
        return;
      }
      setError(
        err instanceof Error ? err : new Error("알 수 없는 오류가 발생했습니다.")
      );
      setData(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    if (!enabled) return;

    fetchOrder();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchOrder, enabled]);

  const refetch = useCallback(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { data, isLoading, isError: error !== null, error, refetch };
}
