"use client";

import { useQuery } from "@tanstack/react-query";

/** 주문 데이터 응답 타입 */
interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

/** useGetOrderDetail 파라미터 */
interface UseGetOrderDetailParams {
  orderId?: string;
  enabled?: boolean;
}

/**
 * 주문 데이터를 조회하는 API 훅 (query)
 * @param params - 주문 조회 파라미터
 * @param params.orderId - 조회할 주문 ID
 * @param params.enabled - 쿼리 활성화 여부 (기본값: true)
 * @returns 주문 데이터, 로딩 상태, 에러 정보
 */
const useGetOrderDetail = (params: UseGetOrderDetailParams = {}) => {
  const { orderId, enabled = true } = params;

  const query = useQuery<Order>({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const url = orderId ? `/api/orders/${orderId}` : "/api/orders";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch order");
      }

      return response.json();
    },
    enabled,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export default useGetOrderDetail;
