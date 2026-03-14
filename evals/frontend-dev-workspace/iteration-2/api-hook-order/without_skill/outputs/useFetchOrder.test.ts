import { renderHook, waitFor, act } from "@testing-library/react";
import { useFetchOrder } from "./useFetchOrder";
import type { Order } from "./types";

const mockOrder: Order = {
  id: "order-1",
  orderNumber: "ORD-20260314-001",
  status: "confirmed",
  items: [
    {
      id: "item-1",
      productName: "TypeScript 핸드북",
      quantity: 1,
      unitPrice: 35000,
    },
  ],
  totalAmount: 35000,
  createdAt: "2026-03-14T09:00:00Z",
  updatedAt: "2026-03-14T09:05:00Z",
};

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useFetchOrder", () => {
  it("orderId로 주문 데이터를 성공적으로 가져온다", async () => {
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

  it("API 응답이 실패하면 에러 상태를 반환한다", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "not-found" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toContain("404");
  });

  it("enabled가 false이면 요청을 보내지 않는다", () => {
    renderHook(() =>
      useFetchOrder({ orderId: "order-1", enabled: false })
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refetch를 호출하면 데이터를 다시 가져온다", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockOrder,
    });

    const { result } = renderHook(() =>
      useFetchOrder({ orderId: "order-1" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("orderId가 변경되면 새 데이터를 자동으로 가져온다", async () => {
    const secondOrder = { ...mockOrder, id: "order-2", orderNumber: "ORD-20260314-002" };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockOrder })
      .mockResolvedValueOnce({ ok: true, json: async () => secondOrder });

    const { result, rerender } = renderHook(
      ({ orderId }) => useFetchOrder({ orderId }),
      { initialProps: { orderId: "order-1" } }
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
