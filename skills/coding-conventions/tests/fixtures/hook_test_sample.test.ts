import { renderHook, act } from '@testing-library/react';
import useLoginForm from '../index';

describe('useLoginForm', () => {
  it('초기 상태는 빈 문자열이다', () => {
    // Arrange
    const { result } = renderHook(() => useLoginForm());

    // Act (없음)

    // Assert
    expect(result.current.form.email).toBe('');
    expect(result.current.form.password).toBe('');
  });

  it('handleChange 호출 시 폼 상태가 업데이트된다', () => {
    // Arrange
    const { result } = renderHook(() => useLoginForm());

    // Act
    act(() => {
      result.current.handleChange('email', 'test-value');
    });

    // Assert
    expect(result.current.form.email).toBe('test-value');
  });
});
