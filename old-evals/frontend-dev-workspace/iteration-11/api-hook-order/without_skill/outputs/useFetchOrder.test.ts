import { renderHook, waitFor, act } from "@testing-library/react";
import { useFetchOrder } from "./useFetchOrder";
import type { Order } from "./types";

const mockOrder: Order = {
  id: "order-123",
  orderNumber: "ORD-2026-0001",
  status: "confirmed",
  items: [
    {
      id: "item-1",
      productName: "Widget A",
      quantity: 2,
      unitPrice: 15000,
      totalPrice: 30000,
    },
  ],
  totalAmount: 30000,
  createdAt: "2026-03-15T10:00:00Z",
  updatedAt: "2026-03-15T10:00:00Z",
};

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("useFetchOrder", () => {
  it("should fetch order data on mount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrder,
    });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-123" })
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockOrder);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/orders/order-123",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "nonexistent" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toContain("404");
    expect(result.current.data).toBeNull();
  });

  it("should handle network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-123" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("should not fetch when enabled is false", async () => {
    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-123" }, { enabled: false })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should refetch when refetch is called", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockOrder, status: "shipped" as const }),
      });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-123" })
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

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should refetch when orderId changes", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrder,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockOrder, id: "order-456" }),
      });

    const { result, rerender } = renderHook(
      ({ orderId }) => useFetchOrder({ orderId }),
      { initialProps: { orderId: "order-123" } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ orderId: "order-456" });

    await waitFor(() => {
      expect(result.current.data?.id).toBe("order-456");
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
