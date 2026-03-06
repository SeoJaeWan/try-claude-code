/**
 * Button 컴포넌트
 * @param props.title - 버튼 제목
 * @param props.onClick - 클릭 핸들러
 * @param props.disabled - 비활성화 여부
 */
interface ButtonProps {
  title: string;
  onClick: () => void;
  disabled: boolean;
}

const Button = (props: ButtonProps) => {
  const { title, onClick, disabled } = props;

  return (
    <div>
      {/* TODO: UI 구현 */}
    </div>
  );
};

export default Button;
