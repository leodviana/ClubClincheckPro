import React from "react";
export function Button({children, className="", ...props}: React.ButtonHTMLAttributes<HTMLButtonElement>){
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium
      text-white shadow-soft transition
      bg-gradient-to-r from-brand-pink via-brand-magenta to-brand-blue
      hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-brand-magenta/30
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >{children}</button>
  );
}
