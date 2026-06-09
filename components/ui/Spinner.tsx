import React from "react";

type SpinnerProps = {
  size?: number;
  className?: string;
};

export default function Spinner({ size = 24, className = "" }: SpinnerProps) {
  const px = `${size}px`;
  return (
    <div style={{ width: px, height: px }} className={`inline-block ${className}`} aria-hidden="true">
      <div
        className="w-full h-full rounded-full animate-spin"
        style={{
          background: "conic-gradient(var(--brand-pink), var(--brand-magenta), var(--brand-blue))",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0)",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0)",
        }}
      />
    </div>
  );
}
