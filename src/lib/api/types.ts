// Tipos compartilhados com os Edge Functions do Backoffice.
// Fonte de verdade: supabase/functions/{buscar-produto, cadastrar-produto,
// app-consulta-veiculo, app-s3-presign, tipos-fotos, verificacao-status, ...}.

export type ConsultaVeiculo = {
  placa: string;
  chassi: string;
  renavam: string;
  marca: string;
  modelo: string;
  cor: string;
  combustivel: string;
  ano_fabricacao: string;
  ano_modelo: string;
  motor: string;
  cod_fipe: string;
  portas: string;
  transmissao: string;
};

export type ConsultaVeiculoResponse = {
  success: boolean;
  found: boolean;
  data: ConsultaVeiculo | null;
  error?: string;
};

export type BuscarProdutoResponse =
  | { error: string }
  | {
      product: {
        uuid: string;
        plate: string;
        chassis: string | null;
        renavam: string | null;
        has_key: boolean;
        type_uuid: string | null;
        color: string | null;
        engine: string | null;
        mileage: number | null;
        entry_type_uuid: string | null;
        initial_status_uuid: string | null;
        branch_uuid: string | null;
        deposit_uuid: string | null;
        consignor_uuid: string | null;
        engine_number_vehicle: string | null;
        engine_number_base: string | null;
        engine_discrepancies_uuid: string[];
        chassis_number_vehicle: string | null;
        chassis_number_base: string | null;
        chassis_discrepancies_uuid: string[];
        final_classification_uuid: string | null;
        final_approval_status: "aprovado" | "reprovado" | null;
        rejection_reasons_uuid: string[];
        rejection_notes: string | null;
        charge_towing: boolean | null;
        towing_km_initial: number | null;
        towing_km_final: number | null;
      };
      fipe_data: {
        fipe_codigo: string | null;
        model: string | null;
        brand: string | null;
        year: string | null;
        fuel: string | null;
        price: number | null;
      };
      item_attributes: { uuid: string; value: string | null }[];
      media: { uuid: string; photo_type_id: number | null; name: string; url: string }[];
      // Não vem do backend mas é prático devolver para a UI saber
      // se existe entrada aberta — true quando há campos da entrada (branch_uuid).
      // Em reentrada o backend devolve só dados operacionais herdados (sem media/divergences),
      // mas para diferenciar perfeitamente usamos o helper na camada cliente.
    };

export type CadastrarProdutoPayload = {
  user_data: { uuid: string; account_uuid?: string };
  product: {
    uuid?: string;
    plate: string;
    chassis?: string | null;
    renavam?: string | null;
    engine?: string | null;
    color?: string | null;
    has_key?: boolean;
    mileage?: number | null;
    type_uuid?: string | null;
    branch_uuid: string;
    deposit_uuid?: string | null;
    consignor_uuid?: string | null;
    entry_type_uuid?: string | null;
    charge_towing?: boolean;
    km_initial?: number | null;
    km_final?: number | null;
  };
  fipe_data?: {
    brand?: string | null;
    model?: string | null;
    fuel?: string | null;
    fipe_codigo?: string | null;
    price?: number | null;
  };
  item_attributes?: { uuid: string; value: string | null }[];
};

export type CadastrarProdutoResponse = {
  success: 0 | 1;
  uuid?: string;
  product_entry_uuid?: string;
  is_update?: boolean;
  message?: string;
  code?: string;
};

export type PresignFile = {
  path: string;
  upload_url: string;
  final_url: string;
  content_type: string;
};

export type PresignResponse = PresignFile | { files: PresignFile[] };

export type PhotoType = {
  id: string;
  text: string;
  is_required: boolean;
  sort_order: number;
};

export type VerificationStatus = {
  id: string;
  name: string;
  applies_to:
    | "engine"
    | "chassis"
    | "rejection"
    | "initial_condition"
    | "final_classification"
    | string;
  usage_context?: string | null;
};

export type LookupItem = { value: string; label: string };
