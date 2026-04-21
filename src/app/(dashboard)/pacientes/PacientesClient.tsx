"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Users, Plus, Phone, Mail, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { excluirPaciente, excluirPacienteConfirmado } from "./actions";

interface Paciente {
  id: string;
  nome_completo: string;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  ativo: boolean;
}

interface Props {
  pacientes: Paciente[];
  canEdit: boolean;
}

function ModalExcluir({ paciente, onClose }: { paciente: Paciente; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"checking" | "confirm" | "confirmWithConsultas">("checking");
  const [count, setCount] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useState(() => {
    startTransition(async () => {
      const res = await excluirPaciente(paciente.id);
      if (res.temConsultas) {
        setCount(res.count);
        setStep("confirmWithConsultas");
      } else {
        setStep("confirm");
      }
    });
  });

  function handleConfirm() {
    startTransition(async () => {
      const res = await excluirPacienteConfirmado(paciente.id);
      if (res.error) setErro(res.error);
      else onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          {step === "checking" ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-forest-400" />
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rust/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rust" />
                </div>
                <div>
                  <p className="font-display text-lg text-forest">Excluir paciente</p>
                  <p className="text-sm text-forest-600 mt-1">
                    Tem certeza que deseja excluir <strong>{paciente.nome_completo}</strong>? Esta ação é irreversível.
                  </p>
                </div>
              </div>

              {step === "confirmWithConsultas" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <strong>Atenção:</strong> Este paciente possui <strong>{count}</strong> consulta{count !== 1 ? "s" : ""} agendada{count !== 1 ? "s" : ""}. Ao confirmar, as consultas também serão excluídas.
                </div>
              )}

              {erro && <p className="text-sm text-rust">{erro}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="flex-1 bg-rust text-cream px-4 py-2 rounded-xl text-sm font-medium hover:bg-rust/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {isPending ? "Excluindo…" : "Sim, excluir"}
                </button>
                <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function PacientesClient({ pacientes, canEdit }: Props) {
  const [busca, setBusca] = useState("");
  const [excluindo, setExcluindo] = useState<Paciente | null>(null);

  const filtrados = useMemo(() =>
    pacientes.filter(p =>
      !busca || p.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      p.email?.toLowerCase().includes(busca.toLowerCase()) ||
      p.telefone?.includes(busca)
    ), [pacientes, busca]);

  return (
    <div>
      {excluindo && <ModalExcluir paciente={excluindo} onClose={() => setExcluindo(null)} />}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
        <input
          type="text"
          placeholder="Buscar paciente por nome, e-mail ou telefone…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="input-field pl-9 h-9 text-sm"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
          <h3 className="font-display text-2xl text-forest mb-2">
            {busca ? "Nenhum resultado" : "Nenhum paciente cadastrado"}
          </h3>
          <p className="text-forest-600 mb-6">
            {busca ? "Nenhum paciente com esse nome." : "Cadastre o primeiro paciente para começar a agendar."}
          </p>
          {canEdit && !busca && (
            <Link href="/pacientes/novo" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Cadastrar paciente
            </Link>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-sand/20">
            {filtrados.map(p => (
              <li key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream/50 transition-colors">
                <div className="w-11 h-11 rounded-full bg-peach/40 text-rust flex items-center justify-center font-display text-lg shrink-0">
                  {p.nome_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-forest truncate">{p.nome_completo}</p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-forest-600">
                    {p.telefone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />{p.telefone}
                      </span>
                    )}
                    {p.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{p.email}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/pacientes/${p.id}/editar`} className="p-2 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors" title="Editar paciente">
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setExcluindo(p)}
                      className="p-2 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust transition-colors"
                      title="Excluir paciente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
