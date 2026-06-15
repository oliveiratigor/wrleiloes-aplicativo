import { apiCall } from "@/lib/api";
import type { ConsultaVeiculo, ConsultaVeiculoResponse } from "./types";

export async function consultaVeiculo(input: {
  plate?: string;
  chassis?: string;
}): Promise<{ data: ConsultaVeiculo | null; error: string | null }> {
  const { data, error } = await apiCall<typeof input, ConsultaVeiculoResponse>(
    "app-consulta-veiculo",
    input,
  );
  if (error) return { data: null, error };
  if (!data || !data.found) return { data: null, error: null };
  return { data: data.data, error: null };
}
