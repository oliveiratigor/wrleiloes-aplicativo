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
  // Reaproveita a tabela `system_logs` do Backoffice.
  // Backoffice lê isso na futura tela /diagnostico-app filtrando por source = 'app-mobile-v2'.
  try {
    await supabase.from("system_logs").insert({
      type: entry.ok ? "info" : "error",
      source: SOURCE,
      payload: {
        fn: entry.fn,
        status: entry.status,
        latency_ms: entry.latency_ms,
        ok: entry.ok,
        error: entry.error ?? null,
        request_preview: entry.request_preview ?? null,
        response_preview: entry.response_preview ?? null,
        ts: entry.ts,
      },
    });
  } catch {
    // não derruba o app por falha de telemetria
  }
}

/**
 * Wrapper único de chamadas a Edge Functions.
 * Mede latência, grava log local (ring buffer) e tenta enviar telemetria.
 */
const GENERIC_ERROR =
  "Não foi possível concluir a operação. Verifique sua conexão e tente novamente.";

/** Erros crus do supabase-js que nunca devem chegar ao usuário final. */
function isRawClientError(msg?: string | null): boolean {
  if (!msg) return true;
  return (
    /non-2xx status code/i.test(msg) ||
    /Failed to (fetch|send a request)/i.test(msg) ||
    /^FunctionsHttpError/i.test(msg) ||
    /NetworkError/i.test(msg)
  );
}

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
      console.error(`[apiCall] ${fn} falhou`, res.error);
      const ctx = (
        res.error as unknown as { context?: { status?: number; json?: () => Promise<unknown> } }
      ).context;
      status = ctx?.status ?? null;

      // supabase-js v2: o corpo da função (com a mensagem em PT-BR) fica em error.context
      let body: unknown = null;
      try {
        if (ctx && typeof ctx.json === "function") {
          body = await ctx.json();
        }
      } catch {
        body = null;
      }

      if (body && typeof body === "object") {
        // devolve o corpo da função para quem chamou tratar códigos (ex.: OPEN_ENTRY_EXISTS)
        data = body as TRes;
        const bodyMsg = (body as { message?: unknown }).message;
        if (typeof bodyMsg === "string" && bodyMsg.trim()) {
          errorMsg = bodyMsg.trim();
        }
      }

      if (!errorMsg) {
        errorMsg = isRawClientError(res.error.message)
          ? GENERIC_ERROR
          : res.error.message;
      }
    } else {
      ok = true;
      status = 200;
    }
  } catch (e) {
    console.error(`[apiCall] ${fn} exceção`, e);
    const raw = e instanceof Error ? e.message : String(e);
    errorMsg = isRawClientError(raw) ? GENERIC_ERROR : raw;
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
