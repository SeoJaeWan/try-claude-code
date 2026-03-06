import { renderHook, act } from '@testing-library/react';
import useLogin from '../index';

describe('useLogin', () => {
  it('훅이 정상적으로 초기화된다', () => {
    // Arrange
    const { result } = renderHook(() => useLogin());

    // Act
    const { result } = renderHook(() => useLogin());

    // Assert
    expect(result.current).toBeDefined();
  });

  it('상태 변경이 정상적으로 동작한다', () => {
    // Arrange
    const { result } = renderHook(() => useLogin());

    // Act
    act(() => {
      // TODO: 상태 변경 로직
    });

    // Assert
    expect(result.current).toBeDefined();
  });
});
