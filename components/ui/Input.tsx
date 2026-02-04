import React, { useEffect, useRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  multiline?: boolean;
  rows?: number;
  autoGrow?: boolean; // when multiline, auto-expand height to fit content
};

export function Input(props: InputProps) {
  const { className = "", multiline, rows, autoGrow = true, ...rest } = props as any;

  const baseClass = `border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/30 ${className}`;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!multiline || !autoGrow) return;
    const ta = textareaRef.current;
    if (!ta) return;
    // reset height then set to scrollHeight to auto-grow
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [multiline, autoGrow, (rest as any).value]);

  if (multiline) {
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoGrow && textareaRef.current) {
        const ta = textareaRef.current;
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
      }
      if (typeof rest.onInput === "function") rest.onInput(e as any);
    };

    return (
      <textarea
        {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        ref={textareaRef}
        rows={rows ?? 2}
        onInput={handleInput}
        className={"w-full resize-y min-h-[44px] max-h-48 overflow-auto " + baseClass}
      />
    );
  }

  return <input {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} className={baseClass} />;
}
