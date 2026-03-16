"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Order, FetchOrderParams, UseFetchOrderResult } from "./types";

interface State {
  data: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

type Action =
  | { type: "FETCH_INIT" }
  | { type: "FETCH_SUCCESS"; payload: Order }
  | { type: "FETCH_FAILURE"; payload: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_INIT":
      return { ...state, isLoading: true, isError: false, error: null };
    case "FETCH_SUCCESS":
      return {
        data: action.payload,
        isLoading: false,
        isError: false,
        error: null,
      };
    case "FETCH_FAILURE":
      return {
        data: null,
        isLoading: false,
        isError: true,
        error: action.payload,
      };
    default:
      return state;
  }
}

const initialState: State = {
  data: null,
  isLoading: false,
  isError: false,
  error: null,
};

/**
 * useFetchOrder - query 방식으로 주문 데이터를 가져오는 API 훅
 *
 * @param params.orderId - 조회할 주문 ID
 * @param options.enabled - false로 설정하면 자동 fetch를 비활성화 (기본값: true)
 * @returns { data, isLoading, isError, error, refetch }
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError, error, refetch } = useFetchOrder({
 *   orderId: "order-123",
 * });
 * ```
 */
export function useFetchOrder(
  params: FetchOrderParams,
  options: { enabled?: boolean } = {}
): UseFetchOrderResult {
  const { orderId } = params;
  const { enabled = true } = options;

  const [state, dispatch] = useReducer(reducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch({ type: "FETCH_INIT" });

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch order: ${response.status} ${response.statusText}`
        );
      }

      const order: Order = await response.json();
      dispatch({ type: "FETCH_SUCCESS", payload: order });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Request was cancelled, do not update state
        return;
      }
      dispatch({
        type: "FETCH_FAILURE",
        payload: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }, [orderId]);

  // Auto-fetch on mount and when orderId changes
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

  return {
    data: state.data,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.error,
    refetch,
  };
}
