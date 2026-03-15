/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFetchOrder } from "./useFetchOrder";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const MOCK_ORDER = {
  id: "order-1",
  status: "confirmed" as const,
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      productName: "Widget",
      quantity: 2,
      unitPrice: 1500,
    },
  ],
  totalAmount: 3000,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
};

function mockFetchSuccess(data: unknown = MOCK_ORDER) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  }) as jest.Mock;
}

function mockFetchFailure(status = 500, statusText = "Internal Server Error") {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
  }) as jest.Mock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useFetchOrder", () => {
  it("fetches order data successfully", async () => {
    mockFetchSuccess();

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" }),
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(MOCK_ORDER);
    expect(result.current.error).toBeNull();
    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith("/api/orders/order-1");
  });

  it("handles fetch errors", async () => {
    mockFetchFailure(404, "Not Found");

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-999" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("404");
  });

  it("does not fetch when orderId is undefined", () => {
    mockFetchSuccess();

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: undefined }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not fetch when enabled is false", () => {
    mockFetchSuccess();

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1", enabled: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refetches when refetch is called", async () => {
    mockFetchSuccess();

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mutate mock data for refetch
    const updatedOrder = { ...MOCK_ORDER, status: "shipped" as const };
    mockFetchSuccess(updatedOrder);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual(updatedOrder);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("refetches when orderId changes", async () => {
    mockFetchSuccess();

    const { result, rerender } = renderHook(
      ({ orderId }: { orderId: string }) => useFetchOrder({ orderId }),
      { initialProps: { orderId: "order-1" } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const secondOrder = { ...MOCK_ORDER, id: "order-2" };
    mockFetchSuccess(secondOrder);

    rerender({ orderId: "order-2" });

    await waitFor(() => {
      expect(result.current.data).toEqual(secondOrder);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/orders/order-2");
  });
});
