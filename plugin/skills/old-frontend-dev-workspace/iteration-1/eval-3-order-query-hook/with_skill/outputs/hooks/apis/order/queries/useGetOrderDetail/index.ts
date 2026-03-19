import { useQuery } from "@tanstack/react-query";

/** 주문 상세 응답 타입 */
interface OrderDetail {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

/** useGetOrderDetail 파라미터 */
interface UseGetOrderDetailParams {
  orderId: string;
  enabled?: boolean;
}

/** query key */
const orderDetailQueryKey = (orderId: string) => ["order", "detail", orderId] as const;

/** endpoint */
const orderDetailEndpoint = (orderId: string) => `/api/orders/${orderId}`;

/** fetch 함수 */
const fetchOrderDetail = async (orderId: string): Promise<OrderDetail> => {
  const response = await fetch(orderDetailEndpoint(orderId));

  if (!response.ok) {
    throw new Error("주문 상세 정보를 불러올 수 없습니다");
  }

  return response.json();
};

/**
 * 주문 상세 데이터를 조회하는 API 훅 (query)
 * @param params - 주문 조회 파라미터
 * @param params.orderId - 조회할 주문 ID
 * @param params.enabled - 쿼리 활성화 여부 (기본값: true)
 * @returns 주문 상세 데이터, 로딩 상태, 에러 정보
 */
const useGetOrderDetail = (params: UseGetOrderDetailParams) => {
  const { orderId, enabled = true } = params;

  const query = useQuery<OrderDetail>({
    queryKey: orderDetailQueryKey(orderId),
    queryFn: () => fetchOrderDetail(orderId),
    enabled,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export default useGetOrderDetail;
