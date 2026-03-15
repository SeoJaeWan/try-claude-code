import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import useFetchOrder from "./index";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useFetchOrder", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("주문 데이터를 성공적으로 가져온다", async () => {
    // Arrange
    const mockOrder = {
      id: "order-1",
      status: "completed",
      totalAmount: 50000,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrder,
    });

    // Act
    const { result } = renderHook(
      () => useFetchOrder({ orderId: "order-1" }),
      { wrapper: createWrapper() },
    );

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockOrder);
    expect(result.current.isError).toBe(false);
  });

  it("주문 조회 실패 시 에러를 반환한다", async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    // Act
    const { result } = renderHook(
      () => useFetchOrder({ orderId: "invalid-id" }),
      { wrapper: createWrapper() },
    );

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("enabled가 false이면 쿼리를 실행하지 않는다", () => {
    // Arrange & Act
    const { result } = renderHook(
      () => useFetchOrder({ orderId: "order-1", enabled: false }),
      { wrapper: createWrapper() },
    );

    // Assert
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("orderId 없이 호출하면 전체 주문 목록 엔드포인트를 사용한다", async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Act
    const { result } = renderHook(() => useFetchOrder(), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith("/api/orders");
  });
});
