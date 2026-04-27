"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import Link from "next/link";
import { Search, Pencil, Users, Plus, Mail, Trash2, Loader2, AlertTriangle, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import { excluirPaciente, excluirPacienteConfirmado, toggleAtivoPaciente } from "./actions";

interface Paciente {
  id: string;
  nome_completo: string;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  ativo: boolean;
}

interface Profissional { id: string; nome_completo: string }

interface Props {
  pacientes: Paciente[];
  canEdit: boolean;
  profissionais?: Profissional[];
  pacienteProfMap?: Record<string, string>;
}

function ModalExcluir({ paciente, onClose }: { paciente: Paciente; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"checking" | "confirm" | "confirmWithConsultas">("checking");
  const [count, setCount] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const res = await excluirPaciente(paciente.id);
      if (res.temConsultas) {
        setCount(res.count);
        setStep("confirmWithConsultas");
      } else {
        setStep("confirm");
      }
    });
  }, []);

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

function ModalConfirmarInativar({ nome, onConfirm, onClose }: { nome: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-display text-lg text-forest">Desativar paciente</p>
              <p className="text-sm text-forest-600 mt-1">
                Tem certeza que deseja desativar <strong>{nome}</strong>? O paciente não aparecerá mais nas listagens ativas.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onConfirm}
              className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
            >
              <ToggleLeft className="w-4 h-4" />
              Sim, desativar
            </button>
            <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function PacientesClient({ pacientes, canEdit, profissionais = [], pacienteProfMap = {} }: Props) {
  const [busca, setBusca] = useState("");
  const [excluindo, setExcluindo] = useState<Paciente | null>(null);
  const [inativando, setInativando] = useState<Paciente | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [filtroProfId, setFiltroProfId] = useState("");
  const [, startTransition] = useTransition();

  function executarToggle(id: string) {
    setTogglingId(id);
    startTransition(async () => {
      await toggleAtivoPaciente(id);
      setTogglingId(null);
    });
  }

  function handleToggleAtivo(p: Paciente) {
    if (p.ativo) {
      setInativando(p);
    } else {
      executarToggle(p.id);
    }
  }

  const filtrados = useMemo(() =>
    pacientes.filter(p => {
      if (!mostrarInativos && !p.ativo) return false;
      if (filtroProfId && pacienteProfMap[p.id] !== filtroProfId) return false;
      return !busca || p.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
        p.email?.toLowerCase().includes(busca.toLowerCase()) ||
        p.telefone?.includes(busca);
    }), [pacientes, busca, mostrarInativos, filtroProfId, pacienteProfMap]);

  const inativos = pacientes.filter(p => !p.ativo).length;

  return (
    <div>
      {excluindo && <ModalExcluir paciente={excluindo} onClose={() => setExcluindo(null)} />}
      {inativando && (
        <ModalConfirmarInativar
          nome={inativando.nome_completo}
          onConfirm={() => { executarToggle(inativando.id); setInativando(null); }}
          onClose={() => setInativando(null)}
        />
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
          <input
            type="text"
            placeholder="Buscar paciente por nome, e-mail ou telefone…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-9 h-9 text-sm"
          />
        </div>
        {profissionais.length > 0 && (
          <div className="relative">
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-forest-400 pointer-events-none" />
            <select
              value={filtroProfId}
              onChange={e => setFiltroProfId(e.target.value)}
              className={`h-9 pl-3 pr-8 rounded-xl border text-sm appearance-none transition-colors ${filtroProfId ? "bg-forest/10 border-forest/30 text-forest font-medium" : "border-sand/40 text-forest-500 hover:bg-sand/20 bg-white"}`}
            >
              <option value="">Todos os profissionais</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome_completo}</option>
              ))}
            </select>
          </div>
        )}
        {inativos > 0 && (
          <button
            onClick={() => setMostrarInativos(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 h-9 rounded-xl border transition-colors ${mostrarInativos ? "bg-forest/10 border-forest/30 text-forest" : "border-sand/40 text-forest-500 hover:bg-sand/20"}`}
            title={mostrarInativos ? "Ocultar inativos" : "Mostrar inativos"}
          >
            {mostrarInativos ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Inativos ({inativos})
          </button>
        )}
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
              <li key={p.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-cream/50 transition-colors ${!p.ativo ? "opacity-60" : ""}`}>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-display text-lg shrink-0 ${p.ativo ? "bg-peach/40 text-rust" : "bg-gray-100 text-gray-400"}`}>
                  {p.nome_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-forest truncate">{p.nome_completo}</p>
                    {!p.ativo && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full shrink-0">Inativo</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 text-sm text-forest-600">
                    {p.telefone && (
                      <a
                        href={`https://wa.me/55${p.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
                        title="Abrir no WhatsApp"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />{p.telefone}
                      </a>
                    )}
                    {p.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{p.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleAtivo(p)}
                    disabled={togglingId === p.id}
                    className={`p-2 rounded-lg transition-colors ${p.ativo ? "hover:bg-amber-50 text-amber-500 hover:text-amber-600" : "hover:bg-green-50 text-gray-400 hover:text-green-600"}`}
                    title={p.ativo ? "Desativar paciente" : "Reativar paciente"}
                  >
                    {togglingId === p.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : p.ativo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  {canEdit && (
                    <>
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
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
