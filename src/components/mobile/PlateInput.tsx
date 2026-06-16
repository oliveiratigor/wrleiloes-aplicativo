import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  onValueChange: (v: string) => void;
};

export const PlateInput = forwardRef<HTMLInputElement, Props>(function PlateInput(
  { onValueChange, className, value, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      {...rest}
      value={value}
      onChange={(e) => onValueChange(e.target.value.toUpperCase().replace(/\s+/g, ""))}
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
      inputMode="text"
      className={cn(
        "block w-full rounded-2xl border-2 border-border bg-white px-4 py-5 text-center text-2xl font-black uppercase tracking-[0.4em] text-foreground shadow-sm transition-all placeholder:tracking-[0.3em] placeholder:font-medium placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
        className,
      )}
    />
  );
});
