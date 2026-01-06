import React from "react";
export function Avatar({name, size=32}:{name:string; size?:number}){
  const initials = name.split(' ').map(s => s[0]?.toUpperCase()).slice(0,2).join('');
  return (
    <div
      style={{ width:size, height:size }}
      className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-pink via-brand-magenta to-brand-blue text-white text-xs font-semibold"
      aria-label={name}
    >
      {initials}
    </div>
  );
}
