/**
 * Tradução dos códigos de erro do edge `cadastrar-produto` para textos claros
 * em português. O `code` cru nunca deve chegar à tela.
 */
export type CadastroErrorAction = "open-existing" | "back-to-search" | "sign-in" | null;

export type CadastroErrorInfo = {
  message: string;
  action: CadastroErrorAction;
  actionLabel?: string;
  showRequestId: boolean;
};

const MAP: Record<string, Omit<CadastroErrorInfo, "showRequestId">> = {
  OPEN_ENTRY_EXISTS: {
    message: "Este veículo já está no pátio com entrada aberta.",
    action: "open-existing",
    actionLabel: "Abrir cadastro existente",
  },
  PLATE_ALREADY_EXISTS: {
    message: "Já existe um veículo cadastrado com esta placa.",
    action: "open-existing",
    actionLabel: "Abrir cadastro existente",
  },
  CHASSIS_ALREADY_EXISTS: {
    message:
      "Já existe um veículo com este chassi. Confira o número ou deixe em branco se não estiver legível.",
    action: null,
  },
  PLATE_MISMATCH: {
    message:
      "Os dados deste cadastro não conferem com a placa informada. Volte à busca e comece de novo.",
    action: "back-to-search",
    actionLabel: "Voltar à busca",
  },
  MISSING_BRANCH: {
    message: "Selecione a filial antes de salvar.",
    action: null,
  },
  PLATE_REQUIRED: {
    message: "Informe a placa do veículo antes de salvar.",
    action: null,
  },
  USER_REQUIRED: {
    message: "Sua sessão expirou. Faça login novamente para continuar.",
    action: "sign-in",
    actionLabel: "Ir para o login",
  },
};

const GENERIC = "Não foi possível salvar. Tente novamente.";

export function describeCadastroError(code?: string | null): CadastroErrorInfo {
  const hit = code ? MAP[code] : undefined;
  if (hit) return { ...hit, showRequestId: false };
  if (code === "NETWORK") {
    return {
      message:
        "Não foi possível salvar. Verifique sua conexão e tente novamente.",
      action: null,
      showRequestId: false,
    };
  }
  return { message: GENERIC, action: null, showRequestId: true };
}
