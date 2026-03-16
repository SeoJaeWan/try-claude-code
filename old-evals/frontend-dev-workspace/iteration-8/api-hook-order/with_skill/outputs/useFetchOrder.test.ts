import { renderHook, waitFor, act } from "@testing-library/react";
import { useFetchOrder } from "./useFetchOrder";

const mockOrder = {
  id: "order-1",
  orderNumber: "ORD-2026-001",
  status: "confirmed" as const,
  items: [
    {
      id: "item-1",
      productName: "Widget",
      quantity: 2,
      unitPrice: 1500,
    },
  ],
  totalAmount: 3000,
  createdAt: "2026-03-15T00:00:00Z",
  updatedAt: "2026-03-15T00:00:00Z",
};

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useFetchOrder", () => {
  it("should return initial state when orderId is undefined", () => {
    const { result } = renderHook(() =>
      useFetchOrder({ orderId: undefined })
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should fetch order data successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrder,
    });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockOrder);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/orders/order-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("should handle fetch error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-999" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe(
      "Failed to fetch order: 404"
    );
  });

  it("should handle network error", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("should refetch when refetch is called", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockOrder, status: "shipped" }),
      });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.status).toBe("confirmed");

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data?.status).toBe("shipped");
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should refetch when orderId changes", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockOrder, id: "order-2" }),
      });

    const { result, rerender } = renderHook(
      ({ orderId }) => useFetchOrder({ orderId }),
      { initialProps: { orderId: "order-1" as string | undefined } }
    );

    await waitFor(() => {
      expect(result.current.data?.id).toBe("order-1");
    });

    rerender({ orderId: "order-2" });

    await waitFor(() => {
      expect(result.current.data?.id).toBe("order-2");
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
