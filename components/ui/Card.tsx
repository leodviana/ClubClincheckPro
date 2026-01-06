import React from "react";
export function Card({children, className=""}:{children:React.ReactNode; className?:string}){
  return <div className={`rounded-2xl bg-card shadow-soft border border-white/10 ${className}`}>{children}</div>;
}
