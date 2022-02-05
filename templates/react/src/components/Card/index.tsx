import { FC } from "react";

interface CardProps {
  href: string;
}

export const Card: FC<CardProps> = ({ href, children }) => {
  return (
    <a href={href} className="card">
      {children}
    </a>
  );
};