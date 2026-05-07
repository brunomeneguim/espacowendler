/**
 * Envia um broadcast "agenda_changed" para todos os clientes conectados.
 * Deve ser chamado client-side após qualquer operação de criação/edição/remoção
 * de agendamentos feita fora do CalendarioSemanal (ex: formulário /agenda/novo).
 */
import { createClient } from "@/lib/supabase/client";

export async function broadcastAgendaChanged(): Promise<void> {
  const supabase = createClient();
  const channel = supabase.channel("agenda-updates", {
    config: { broadcast: { self: false } },
  });

  await new Promise<void>(resolve => {
    channel.subscribe(status => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "agenda_changed",
          payload: {},
        }).then(() => {
          supabase.removeChannel(channel);
          resolve();
        });
      }
    });
  });
}
