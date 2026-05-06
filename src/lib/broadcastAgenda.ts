/**
 * Stub mantido para compatibilidade — o realtime agora funciona via
 * postgres_changes no cliente (CalendarioSemanal), sem necessidade de
 * broadcast server-side.
 */
export async function broadcastAgendaChange() {
  // no-op
}
