import React, { ReactNode } from "react";

// GOOD: proper TypeScript types, className and children props
interface CardProps {
  title: string;
  className?: string;
  children: ReactNode;
}

const Card = ({ title, className = "", children }: CardProps) => {
  const handleClick = () => {
    // BAD: console.log left in production code
    console.log("Card clicked:", title);

    // BAD: document.querySelector used inside event handler (XSS-adjacent pattern —
    // relies on global DOM queries instead of refs; prone to selecting unintended elements)
    const el = document.querySelector(".card-highlight");
    if (el) {
      (el as HTMLElement).style.background = "yellow";
    }
  };

  return (
    <div
      // BAD: duplicate id pattern — if Card is rendered in a list, every instance
      // gets the same id, violating uniqueness requirement
      id="card-item"
      className={`rounded border p-4 ${className}`}
      onClick={handleClick}
    >
      <h3 className="font-semibold text-base mb-2">{title}</h3>
      <div className="card-highlight">{children}</div>
    </div>
  );
};

export default Card;
