/**
 * useGetUser API 훅 (query)
 * @returns API 호출 결과
 */
const useGetUser = (id?: string) => {
  const query = useQuery({
    queryKey: ['useGetUser', id],
    queryFn: async () => {
      const response = await fetch(`/api/users${id ? `/${id}` : ''}`);
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

export default useGetUser;
