import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30 ${className}`}
    />
  );
}
