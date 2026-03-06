#!/usr/bin/env node
/**
 * Test Suite Generator
 * Generates unit test suite following AAA pattern with Korean specs
 */

import { TEST_SUITE_CONVENTIONS } from "../conventions.mjs";
import { ensureUsePrefix, toCamelCase, toPascalCase } from "../naming.mjs";

export function generateTestSuite(targetName, testType = "function", targetPath = null, includeArrange = true) {
  let normalizedName = targetName;
  if (testType === "hook") {
    normalizedName = ensureUsePrefix(targetName);
  } else if (testType === "component") {
    normalizedName = toPascalCase(targetName);
  } else {
    normalizedName = toCamelCase(targetName);
  }

  let testCode = "";

  if (testType === "hook") {
    testCode = `import { renderHook, act } from '@testing-library/react';
import ${normalizedName} from '../index';

describe('${normalizedName}', () => {
  it('훅이 정상적으로 초기화된다', () => {
    ${includeArrange ? "// Arrange" : ""}
    ${includeArrange ? `const { result } = renderHook(() => ${normalizedName}());` : ""}

    // Act
    ${includeArrange ? "" : `const { result } = renderHook(() => ${normalizedName}());`}

    // Assert
    expect(result.current).toBeDefined();
  });

  it('상태 변경이 정상적으로 동작한다', () => {
    ${includeArrange ? "// Arrange" : ""}
    ${includeArrange ? `const { result } = renderHook(() => ${normalizedName}());` : ""}

    // Act
    ${includeArrange ? "" : `const { result } = renderHook(() => ${normalizedName}());`}
    act(() => {
      // TODO: 상태 변경 로직
    });

    // Assert
    expect(result.current).toBeDefined();
  });
});
`;
  } else if (testType === "component") {
    testCode = `import { render } from '@testing-library/react';
import ${normalizedName} from '../index';

describe('${normalizedName}', () => {
  it('컴포넌트가 렌더링된다', () => {
    ${includeArrange ? "// Arrange" : ""}
    ${includeArrange ? "const props = {};" : ""}

    // Act
    const { container } = ${includeArrange ? `render(<${normalizedName} {...props} />);` : `render(<${normalizedName} />);`}

    // Assert
    expect(container.firstChild).toBeTruthy();
  });

  it('props가 올바르게 전달된다', () => {
    ${includeArrange ? "// Arrange" : ""}
    ${includeArrange ? "const props = { title: 'Test' };" : ""}

    // Act
    ${includeArrange ? `const renderAction = () => render(<${normalizedName} {...props} />);` : `const renderAction = () => render(<${normalizedName} />);`}

    // Assert
    expect(renderAction).not.toThrow();
  });
});
`;
  } else {
    testCode = `import ${normalizedName} from '../index';

describe('${normalizedName}', () => {
  it('함수가 정상적으로 동작한다', () => {
    ${includeArrange ? "// Arrange" : ""}
    ${includeArrange ? "const input = 'test';" : ""}

    // Act
    const result = ${normalizedName}(${includeArrange ? "input" : "'test'"});

    // Assert
    expect(result).toBeDefined();
  });

  it('잘못된 입력에 대해 에러를 처리한다', () => {
    ${includeArrange ? "// Arrange" : ""}
    ${includeArrange ? "const invalidInput = null;" : ""}

    // Act & Assert
    expect(() => {
      ${normalizedName}(${includeArrange ? "invalidInput" : "null"});
    }).toThrow();
  });
});
`;
  }

  return {
    test: testCode,
    file: testType === "component" ? "__tests__/index.test.tsx" : "__tests__/index.test.ts",
    type: testType,
    meta: TEST_SUITE_CONVENTIONS,
    target_path: targetPath,
  };
}

