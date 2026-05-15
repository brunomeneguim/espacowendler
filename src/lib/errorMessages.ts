/**
 * Maps raw Supabase/Postgres error messages to user-friendly Portuguese strings.
 */
export function friendlyError(rawMessage: string): string {
  if (!rawMessage) return "Ocorreu um erro inesperado.";

  const msg = rawMessage.toLowerCase();

  if (msg.includes("duplicate key value violates unique constraint")) {
    return "Este registro já existe.";
  }
  if (msg.includes("row level security") || msg.includes("violates row-level")) {
    return "Você não tem permissão para esta ação.";
  }
  if (msg.includes("foreign key constraint")) {
    return "Este registro está vinculado a outros dados e não pode ser removido.";
  }
  if (msg.includes("not-null constraint") || msg.includes("violates not-null")) {
    return "Campo obrigatório não preenchido.";
  }
  if (msg.includes("invalid input syntax")) {
    return "Formato de dado inválido.";
  }
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch")
  ) {
    return "Erro de conexão. Verifique sua internet.";
  }

  return rawMessage;
}
