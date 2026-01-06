import React from "react";
export function Badge({children, intent="default"}:{children:React.ReactNode; intent?:"success"|"warning"|"default"}){
  const base = "text-xs px-2 py-1 rounded-full";
  const map = { success:"bg-green-100 text-green-700", warning:"bg-amber-100 text-amber-700", default:"bg-slate-100 text-slate-600" } as const;
  return <span className={`${base} ${map[intent]}`}>{children}</span>;
}
