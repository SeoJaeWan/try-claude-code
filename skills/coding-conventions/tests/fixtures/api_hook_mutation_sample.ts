/**
 * useLogin API 훅 (mutation)
 * @returns API 호출 결과
 */
const useLogin = () => {
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/auth/login', {
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

export default useLogin;
