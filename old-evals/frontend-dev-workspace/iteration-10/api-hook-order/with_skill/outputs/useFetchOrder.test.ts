import { renderHook, waitFor, act } from "@testing-library/react";

import { useFetchOrder } from "./useFetchOrder";
import type { Order } from "./types";

const mockOrder: Order = {
  id: "order-1",
  orderNumber: "ORD-20260315-001",
  status: "confirmed",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      productName: "Test Product",
      quantity: 2,
      unitPrice: 10000,
      totalPrice: 20000,
    },
  ],
  totalAmount: 20000,
  shippingAddress: "Seoul, Korea",
  orderedAt: "2026-03-15T09:00:00Z",
  updatedAt: "2026-03-15T09:30:00Z",
};

function createFetchMock(response: unknown, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Not Found",
    json: () => Promise.resolve(response),
  });
}

describe("useFetchOrder", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("should return initial state before fetching", () => {
    global.fetch = createFetchMock(mockOrder);

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1", enabled: false })
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe("function");
  });

  it("should fetch order data when enabled", async () => {
    global.fetch = createFetchMock(mockOrder);

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockOrder);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith("/api/orders/order-1");
  });

  it("should handle API errors", async () => {
    global.fetch = createFetchMock(null, false, 404);

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "nonexistent" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Failed to fetch order");
  });

  it("should handle network errors", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("should not fetch when enabled is false", () => {
    global.fetch = createFetchMock(mockOrder);

    renderHook(() =>
      useFetchOrder({ orderId: "order-1", enabled: false })
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should not fetch when orderId is empty", () => {
    global.fetch = createFetchMock(mockOrder);

    renderHook(() => useFetchOrder({ orderId: "" }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should refetch data when refetch is called", async () => {
    const updatedOrder = { ...mockOrder, status: "delivered" as const };
    global.fetch = createFetchMock(mockOrder);

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockOrder);

    global.fetch = createFetchMock(updatedOrder);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual(updatedOrder);
  });

  it("should refetch when orderId changes", async () => {
    global.fetch = createFetchMock(mockOrder);

    const { result, rerender } = renderHook(
      ({ orderId }: { orderId: string }) => useFetchOrder({ orderId }),
      { initialProps: { orderId: "order-1" } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/orders/order-1");

    const anotherOrder = { ...mockOrder, id: "order-2" };
    global.fetch = createFetchMock(anotherOrder);

    rerender({ orderId: "order-2" });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/orders/order-2");
  });
});
