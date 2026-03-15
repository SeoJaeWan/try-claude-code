import { useQuery } from "@tanstack/react-query";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface UseFetchOrderParams {
  orderId: string;
}

const fetchOrder = async (orderId: string): Promise<Order> => {
  const response = await fetch(`/api/orders/${orderId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.status}`);
  }

  return response.json();
};

const orderQueryKey = (orderId: string) =>
  ["order", "detail", orderId] as const;

const useFetchOrder = ({ orderId }: UseFetchOrderParams) => {
  return useQuery({
    queryKey: orderQueryKey(orderId),
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
  });
};

export default useFetchOrder;
export { orderQueryKey };
export type { Order, OrderItem, UseFetchOrderParams };
