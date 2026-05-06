/**
 * Envia broadcast para o canal "agenda-updates" via Supabase Realtime REST API.
 * Chamado dentro de server actions após qualquer mutação em agendamentos.
 * Fire-and-forget: erros são silenciados para não quebrar a action principal.
 */
export async function broadcastAgendaChange() {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: "realtime:agenda-updates",
            event: "agenda_changed",
            payload: { ts: Date.now() },
          },
        ],
      }),
    });
  } catch {
    // Fire and forget — não bloqueia a action principal
  }
}
