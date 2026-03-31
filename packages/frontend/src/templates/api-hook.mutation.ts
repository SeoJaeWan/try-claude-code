import { useMutation } from "@tanstack/react-query";

const {{hookName}} = () => {
  return useMutation({
    mutationFn: async () => {
      throw new Error("Implement mutationFn");
    }
  });
};

export default {{hookName}};
