"use client";

import { useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { editarAgendamentoAction } from "../../actions";
import { broadcastAgendaChanged } from "@/lib/broadcastAgendaClient";
import { TzOffsetInput } from "./TzOffsetInput";

interface Prof { id: string; nome: string }
interface Sala { id: number; nome: string }

interface Props {
  id: string;
  tipoAgendamento: string;
  defaultProfissionalId: string;
  defaultPacienteId: string | null;
  defaultPacienteNome: string;
  defaultSalaId: string | null;
  defaultData: string;
  defaultHora: string;
  defaultDuracao: number;
  defaultStatus: string;
  defaultObservacoes: string;
  profs: Prof[];
  salas: Sala[];
  canDelete: boolean;
}

export function EditarAgendamentoFormClient({
  id,
  tipoAgendamento,
  defaultProfissionalId,
  defaultPacienteId,
  defaultPacienteNome,
  defaultSalaId,
  defaultData,
  defaultHora,
  defaultDuracao,
  defaultStatus,
  defaultObservacoes,
  profs,
  salas,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { markDirty, resetDirty, guardedNavigate, UnsavedDialog } = useUnsavedChanges(formRef);
  const isAusencia = tipoAgendamento === "ausencia";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      const res = await editarAgendamentoAction(id, fd);
      if (res.error) {
        setErro(res.error);
        return;
      }
      await broadcastAgendaChanged();
      resetDirty();
      router.push("/dashboard");
    });
  }

  return (
    <>
    <form ref={formRef} onSubmit={handleSubmit} onChange={markDirty} className="card space-y-5">
      <TzOffsetInput />
      <input type="hidden" name="tipo_agendamento" value={tipoAgendamento} />

      <ErrorBanner message={erro} />

      {isAusencia && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
          Este agendamento é uma <strong>ausência</strong> — o profissional não estará disponível neste horário.
        </div>
      )}

      <div>
        <label htmlFor="profissional_id" className="label">Profissional</label>
        <select id="profissional_id" name="profissional_id" required className="input-field" defaultValue={defaultProfissionalId}>
          {profs.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {!isAusencia && (
        <div>
          <label className="label">Paciente</label>
          <div className="input-field bg-sand/10 text-forest-700 cursor-default select-none">
            {defaultPacienteNome || "—"}
          </div>
          <input type="hidden" name="paciente_id" value={defaultPacienteId ?? ""} />
        </div>
      )}

      <div>
        <label htmlFor="sala_id" className="label">Sala de atendimento</label>
        <select id="sala_id" name="sala_id" className="input-field" defaultValue={defaultSalaId ?? ""}>
          <option value="">Sem sala definida</option>
          {salas.map(s => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="data" className="label">Data</label>
          <input id="data" name="data" type="date" required className="input-field" defaultValue={defaultData} />
        </div>
        <div>
          <label htmlFor="hora" className="label">Horário</label>
          <input id="hora" name="hora" type="time" required className="input-field" defaultValue={defaultHora} />
        </div>
        <div>
          <label htmlFor="duracao" className="label">Duração (min)</label>
          <input id="duracao" name="duracao" type="number" min="15" step="5" className="input-field" defaultValue={defaultDuracao} />
        </div>
      </div>

      {!isAusencia && (
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" required className="input-field" defaultValue={defaultStatus}>
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="realizado">Realizado</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Falta Justificada</option>
            <option value="faltou">Falta Cobrada</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="observacoes" className="label">Observações</label>
        <textarea id="observacoes" name="observacoes" rows={3} className="input-field resize-none" defaultValue={defaultObservacoes} />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
            : "Salvar alterações"}
        </button>
        <button type="button" onClick={() => guardedNavigate("/dashboard")} className="btn-secondary flex-1">
          Cancelar
        </button>
      </div>
    </form>
    {UnsavedDialog}
    </>
  );
}
