#!/usr/bin/env node
/**
 * Hook Generator
 * Generates custom hook following coding conventions
 */

import { HOOK_CONVENTIONS, resolveHooksRoot } from "../conventions.mjs";
import { ensureUsePrefix } from "../naming.mjs";

function parseState(stateString) {
  if (!stateString) {
    return [];
  }

  const states = [];
  for (const rawState of stateString.split(",")) {
    const state = rawState.trim();
    if (!state.includes(":")) {
      continue;
    }
    const [name, ...rest] = state.split(":");
    states.push({
      name: name.trim(),
      type: rest.join(":").trim(),
    });
  }
  return states;
}

export function generateHook(name, hookType = "util", stateString = null, includeJsdoc = true, includeTest = true) {
  const normalizedName = ensureUsePrefix(name);
  const states = parseState(stateString);
  const hooksRoot = resolveHooksRoot();
  const basePath = hookType === "api" ? `${hooksRoot}/apis` : `${hooksRoot}/utils`;

  const stateObj =
    states.length > 0
      ? states
          .map((s) => {
            if (s.type === "string") {
              return `${s.name}: ''`;
            }
            if (s.type === "boolean") {
              return `${s.name}: false`;
            }
            return `${s.name}: 0`;
          })
          .join(",\n    ")
      : "// Add state here";

  let jsdoc = "";
  if (includeJsdoc && HOOK_CONVENTIONS.jsdoc_required) {
    jsdoc = `/**
 * ${normalizedName} 훅
 * @returns 훅 반환값
 */
`;
  }

  let hookCode = "";
  if (hookType === "form" && states.length > 0) {
    hookCode = `import { useState } from 'react';

${jsdoc}const ${normalizedName} = () => {
  const [form, setForm] = useState({
    ${stateObj}
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return { form, handleChange };
};

export default ${normalizedName};
`;
  } else {
    hookCode = `${jsdoc}const ${normalizedName} = () => {
  // TODO: 훅 로직 구현

  return {};
};

export default ${normalizedName};
`;
  }

  let testCode = "";
  if (includeTest) {
    if (hookType === "form" && states.length > 0) {
      const firstState = states[0].name;
      testCode = `import { renderHook, act } from '@testing-library/react';
import ${normalizedName} from '../index';

describe('${normalizedName}', () => {
  it('초기 상태는 빈 문자열이다', () => {
    // Arrange
    const { result } = renderHook(() => ${normalizedName}());

    // Act (없음)

    // Assert
    expect(result.current.form.${firstState}).toBe('');
  });

  it('handleChange 호출 시 폼 상태가 업데이트된다', () => {
    // Arrange
    const { result } = renderHook(() => ${normalizedName}());

    // Act
    act(() => {
      result.current.handleChange('${firstState}', 'test-value');
    });

    // Assert
    expect(result.current.form.${firstState}).toBe('test-value');
  });
});
`;
    } else {
      testCode = `import { renderHook } from '@testing-library/react';
import ${normalizedName} from '../index';

describe('${normalizedName}', () => {
  it('훅이 정상적으로 초기화된다', () => {
    // Arrange & Act
    const { result } = renderHook(() => ${normalizedName}());

    // Assert
    expect(result.current).toBeDefined();
  });
});
`;
    }
  }

  return {
    hook: hookCode,
    test: testCode,
    folder: `${normalizedName}/`,
    base_path: basePath,
    hook_file: "index.ts",
    test_file: "__tests__/index.test.ts",
  };
}

