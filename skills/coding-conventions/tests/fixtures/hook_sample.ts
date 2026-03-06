/**
 * useLoginForm 훅
 * @returns 훅 반환값
 */
const useLoginForm = () => {
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return { form, handleChange };
};

export default useLoginForm;
