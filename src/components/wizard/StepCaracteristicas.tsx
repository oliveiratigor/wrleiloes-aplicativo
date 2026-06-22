import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type Attribute = { id: string; name: string };

export function StepCaracteristicas({
  entryId,
  productId,
  selectedIds,
  onChange,
}: {
  entryId?: string;
  productId?: string;
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const { data: attributes, isLoading } = useQuery({
    queryKey: ["lookup", "attributes"],
    queryFn: async (): Promise<Attribute[]> => {
      const { data, error } = await supabase
        .from("attributes")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Attribute[];
    },
    staleTime: 5 * 60_000,
  });

  const [hydrated, setHydrated] = useState(false);

  // Hidrata atributos já salvos para essa entrada (caso edição)
  useEffect(() => {
    if (hydrated || selectedIds.length > 0) return;
    let cancelled = false;
    (async () => {
      let resolvedEntryId: string | null | undefined = entryId;
      if (!resolvedEntryId && productId) {
        const { data: openEntry } = await supabase
          .from("product_entries")
          .select("id")
          .eq("product_id", productId)
          .is("exit_date", null)
          .is("deleted_at", null)
          .order("entry_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        resolvedEntryId = openEntry?.id ?? null;
      }
      if (cancelled) return;
      if (!resolvedEntryId) {
        setHydrated(true);
        return;
      }
      const { data: attrs } = await supabase
        .from("product_attributes")
        .select("attribute_id")
        .eq("product_entry_id", resolvedEntryId);
      if (cancelled) return;
      if (attrs && attrs.length > 0) {
        onChange(attrs.map((a) => a.attribute_id as string));
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId, productId]);


  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!attributes || attributes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma característica cadastrada.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Toque para marcar as características presentes no veículo. Opcional — pode avançar sem selecionar.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {attributes.map((a) => {
          const active = selectedIds.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-all active:scale-[0.985]",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                  : "border-border bg-card text-foreground hover:border-primary/40",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              {active && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {selectedIds.length} selecionada(s)
      </p>
    </div>
  );
}
