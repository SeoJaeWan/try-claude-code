import { useQuery } from "@tanstack/react-query";

const {{hookName}} = () => {
  return useQuery({
    queryKey: ["{{domainName}}", "{{hookName}}"],
    queryFn: async () => {
      throw new Error("Implement queryFn");
    }
  });
};

export default {{hookName}};
