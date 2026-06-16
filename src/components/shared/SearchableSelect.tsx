import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export type SearchableOption = { value: string; label: string };

type Props = {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  title?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecionar…",
  emptyText = "Nada encontrado.",
  disabled,
  title,
}: Props) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const selected = options.find((o) => o.value === value);

  const trigger = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      className={cn(
        "w-full min-w-0 justify-between gap-2 rounded-md border-border bg-card font-normal shadow-none hover:bg-card",
        !selected && "text-muted-foreground",
      )}
    >
      <span className="flex-1 min-w-0 truncate text-left uppercase">
        {selected?.label ?? placeholder}
      </span>
      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  const list = (
    <Command className="h-full">
      <CommandInput placeholder="Buscar…" />
      <CommandList className={isMobile ? "max-h-none flex-1" : undefined}>
        <CommandEmpty>{emptyText}</CommandEmpty>
        <CommandGroup>
          {options.map((o) => (
            <CommandItem
              key={o.value}
              value={o.label}
              className="uppercase"
              onSelect={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  o.value === value ? "opacity-100" : "opacity-0",
                )}
              />
              {o.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[50vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-base">{title ?? placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 px-2 pb-[env(safe-area-inset-bottom)]">
            {list}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {list}
      </PopoverContent>
    </Popover>
  );
}
