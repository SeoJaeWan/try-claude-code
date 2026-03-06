#!/usr/bin/env node
/**
 * API Hook Generator
 * Generates TanStack Query API hooks (useQuery/useMutation)
 */

import { API_HOOK_CONVENTIONS, resolveHooksRoot } from "../conventions.mjs";
import { ensureUsePrefix } from "../naming.mjs";

export function generateApiHook(name, method = "query", endpoint = null, includeJsdoc = true, includeTest = true) {
  const normalizedName = ensureUsePrefix(name);
  const endpointPath = endpoint || "/api/resource";
  const hooksRoot = resolveHooksRoot();

  const subfolder = method === "query" ? "queries" : "mutations";
  const basePath = `${hooksRoot}/apis/${subfolder}`;
  const hookPattern = method === "query" ? API_HOOK_CONVENTIONS.query.pattern : API_HOOK_CONVENTIONS.mutation.pattern;

  let jsdoc = "";
  if (includeJsdoc) {
    jsdoc = `/**
 * ${normalizedName} API 훅 (${method})
 * @returns API 호출 결과
 */
`;
  }

  let hookCode = "";
  if (method === "query") {
    hookCode = `${jsdoc}const ${normalizedName} = (id?: string) => {
  const query = ${hookPattern}({
    queryKey: ['${normalizedName}', id],
    queryFn: async () => {
      const response = await fetch(\`${endpointPath}\${id ? \`/\${id}\` : ''}\`);
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      return response.json();
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export default ${normalizedName};
`;
  } else {
    hookCode = `${jsdoc}const ${normalizedName} = () => {
  const mutation = ${hookPattern}({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await fetch('${endpointPath}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Request failed');
      }
      return response.json();
    },
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};

export default ${normalizedName};
`;
  }

  let testCode = "";
  if (includeTest) {
    if (method === "query") {
      testCode = `import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import ${normalizedName} from '../index';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('${normalizedName}', () => {
  it('데이터를 성공적으로 가져온다', async () => {
    // Arrange
    const { result } = renderHook(() => ${normalizedName}(), {
      wrapper: createWrapper(),
    });

    // Act & Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });
});
`;
    } else {
      testCode = `import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import ${normalizedName} from '../index';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('${normalizedName}', () => {
  it('mutation이 성공적으로 실행된다', async () => {
    // Arrange
    const { result } = renderHook(() => ${normalizedName}(), {
      wrapper: createWrapper(),
    });
    const testData = { test: 'data' };

    // Act
    act(() => {
      result.current.mutate(testData);
    });

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
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
    test_file: "__tests__/index.test.tsx",
    subfolder,
  };
}

