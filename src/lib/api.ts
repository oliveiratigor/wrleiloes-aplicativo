import { supabase } from "./supabase";

export type DiagnosticEntry = {
  ts: string;
  fn: string;
  status: number | null;
  latency_ms: number;
  ok: boolean;
  error?: string;
  request_preview?: unknown;
  response_preview?: unknown;
};

const SOURCE = "app-mobile-v2";
const RING_BUFFER_KEY = "wr-vistoria-diag-ring";
const RING_BUFFER_MAX = 200;

function pushLocal(entry: DiagnosticEntry) {
  try {
    const raw = localStorage.getItem(RING_BUFFER_KEY);
    const arr: DiagnosticEntry[] = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    if (arr.length > RING_BUFFER_MAX) arr.length = RING_BUFFER_MAX;
    localStorage.setItem(RING_BUFFER_KEY, JSON.stringify(arr));
  } catch {
    // ignore quota / SSR errors
  }
}

export function readLocalDiagnostics(): DiagnosticEntry[] {
  try {
    const raw = localStorage.getItem(RING_BUFFER_KEY);
    return raw ? (JSON.parse(raw) as DiagnosticEntry[]) : [];
  } catch {
    return [];
  }
}

function truncate(value: unknown, max = 4000): unknown {
  try {
    const s = typeof value === "string" ? value : JSON.stringify(value);
    if (s.length <= max) return value;
    return s.slice(0, max) + `…[truncated ${s.length - max} chars]`;
  } catch {
    return "[unserializable]";
  }
}

async function shipTelemetry(entry: DiagnosticEntry) {
  // Backoffice lê isso na tela /diagnostico-app.
  // Best-effort: nunca quebrar a chamada principal por falha de telemetria.
  try {
    await supabase.from("app_diagnostics").insert({
      source: SOURCE,
      fn: entry.fn,
      status: entry.status,
      latency_ms: entry.latency_ms,
      ok: entry.ok,
      error: entry.error ?? null,
      request_preview: entry.request_preview ?? null,
      response_preview: entry.response_preview ?? null,
    });
  } catch {
    // tabela pode não existir ainda — não derruba o app.
  }
}

/**
 * Wrapper único de chamadas a Edge Functions.
 * Mede latência, grava log local (ring buffer) e tenta enviar telemetria.
 */
export async function apiCall<TReq, TRes>(
  fn: string,
  payload?: TReq,
  opts?: { skipTelemetry?: boolean },
): Promise<{ data: TRes | null; error: string | null; status: number | null }> {
  const started = performance.now();
  let status: number | null = null;
  let ok = false;
  let errorMsg: string | undefined;
  let data: TRes | null = null;

  try {
    const res = await supabase.functions.invoke<TRes>(fn, {
      body: payload as Record<string, unknown> | undefined,
    });
    data = (res.data as TRes) ?? null;
    if (res.error) {
      errorMsg = res.error.message;
      const ctx = (res.error as unknown as { context?: { status?: number } }).context;
      status = ctx?.status ?? null;
    } else {
      ok = true;
      status = 200;
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  const entry: DiagnosticEntry = {
    ts: new Date().toISOString(),
    fn,
    status,
    latency_ms: Math.round(performance.now() - started),
    ok,
    error: errorMsg,
    request_preview: truncate(payload),
    response_preview: truncate(data),
  };

  pushLocal(entry);
  if (!opts?.skipTelemetry) {
    void shipTelemetry(entry);
  }

  return { data, error: errorMsg ?? null, status };
}
