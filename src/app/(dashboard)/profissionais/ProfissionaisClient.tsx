"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Pencil, Stethoscope, Plus, Trash2, Loader2, AlertTriangle, ToggleLeft, ToggleRight, Palette, Check } from "lucide-react";
import { excluirProfissional, excluirProfissionalConfirmado, toggleAtivoProfissional, alterarCorProfissional } from "./actions";
import { PROF_CORES } from "@/lib/profCores";

interface Profissional {
  id: string;
  registro_profissional?: string | null;
  valor_consulta?: number | null;
  valor_plano?: number | null;
  ativo: boolean;
  foto_url?: string | null;
  cor?: string | null;
  profile: { nome_completo: string; email: string } | null;
  especialidade: { nome: string } | null;
}

interface Props {
  profissionais: Profissional[];
  canManage: boolean;
}

function ColorPickerPopover({ profId, currentCor, coresUsadas, onClose }: {
  profId: string;
  currentCor?: string | null;
  coresUsadas: string[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function handleSelect(corId: string) {
    startTransition(async () => {
      await alterarCorProfissional(profId, corId);
      onClose();
    });
  }

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-50 bg-white border border-sand/40 rounded-xl shadow-xl p-2 w-64">
      <div className="grid grid-cols-2 gap-0.5 max-h-48 overflow-y-auto">
        {PROF_CORES.map(c => {
          const inUse = coresUsadas.includes(c.id) && c.id !== currentCor;
          const selected = currentCor === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={inUse || isPending}
              onClick={() => handleSelect(c.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left ${inUse ? "opacity-40 cursor-not-allowed" : "hover:bg-sand/20 cursor-pointer"} ${selected ? "bg-forest/5 font-medium" : ""}`}
            >
              <span className="w-4 h-4 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: c.hex }} />
              <span className="flex-1 truncate text-forest">{c.label}</span>
              {selected && <Check className="w-3 h-3 text-forest shrink-0" />}
              {inUse && <span className="text-[9px] text-forest-400">Em uso</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModalExcluir({ prof, onClose }: { prof: Profissional; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"checking" | "confirm" | "confirmWithConsultas">("checking");
  const [count, setCount] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const res = await excluirProfissional(prof.id);
      setCount(res.count);
      setStep(res.temConsultas ? "confirmWithConsultas" : "confirm");
    });
  }, []);

  function handleConfirm() {
    startTransition(async () => {
      const res = await excluirProfissionalConfirmado(prof.id);
      if (res.error) setErro(res.error);
      else onClose();
    });
  }

  const nome = prof.profile?.nome_completo ?? "Profissional";

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
                  <p className="font-display text-lg text-forest">Excluir profissional</p>
                  <p className="text-sm text-forest-600 mt-1">
                    Tem certeza que deseja excluir <strong>{nome}</strong>? Esta ação é irreversível.
                  </p>
                </div>
              </div>

              {step === "confirmWithConsultas" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                  <strong>Atenção:</strong> Este profissional possui <strong>{count}</strong> consulta{count !== 1 ? "s" : ""} agendada{count !== 1 ? "s" : ""}. Ao confirmar, as consultas também serão excluídas.
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

function formatMoney(val?: number | null) {
  if (!val && val !== 0) return null;
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProfissionaisClient({ profissionais, canManage }: Props) {
  const [busca, setBusca] = useState("");
  const [excluindo, setExcluindo] = useState<Profissional | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [, startTransition] = useTransition();

  const coresUsadas = profissionais.map(p => p.cor).filter(Boolean) as string[];

  function handleToggleAtivo(p: Profissional) {
    setTogglingId(p.id);
    startTransition(async () => {
      await toggleAtivoProfissional(p.id);
      setTogglingId(null);
    });
  }

  const filtrados = useMemo(() =>
    profissionais.filter(p => {
      if (!mostrarInativos && !p.ativo) return false;
      return !busca || p.profile?.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
        p.profile?.email?.toLowerCase().includes(busca.toLowerCase());
    }), [profissionais, busca, mostrarInativos]);

  const inativos = profissionais.filter(p => !p.ativo).length;

  return (
    <div>
      {excluindo && <ModalExcluir prof={excluindo} onClose={() => setExcluindo(null)} />}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
          <input
            type="text"
            placeholder="Buscar profissional por nome ou e-mail…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-9 h-9 text-sm"
          />
        </div>
        {inativos > 0 && (
          <button
            onClick={() => setMostrarInativos(v => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 h-9 rounded-xl border transition-colors ${mostrarInativos ? "bg-forest/10 border-forest/30 text-forest" : "border-sand/40 text-forest-500 hover:bg-sand/20"}`}
          >
            {mostrarInativos ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Inativos ({inativos})
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <Stethoscope className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
          <h3 className="font-display text-2xl text-forest mb-2">
            {busca ? "Nenhum resultado" : "Nenhum profissional cadastrado"}
          </h3>
          <p className="text-forest-600 mb-6">
            {busca ? "Nenhum profissional com esse nome." : "Adicione o primeiro profissional da clínica."}
          </p>
          {canManage && !busca && (
            <Link href="/profissionais/novo" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Cadastrar
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((p, i) => {
            const corInfo = p.cor ? PROF_CORES.find(c => c.id === p.cor) : null;
            const cardBg = corInfo ? `${corInfo.hex}15` : undefined;
            const borderColor = corInfo ? corInfo.hex : undefined;

            return (
              <div
                key={p.id}
                className={`card hover:shadow-warm transition-shadow animate-slide-up border-t-4 ${!p.ativo ? "opacity-60" : ""}`}
                style={{
                  animationDelay: `${i * 50}ms`,
                  backgroundColor: cardBg,
                  borderTopColor: borderColor ?? "transparent",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.profile?.nome_completo ?? ""} className="w-12 h-12 rounded-full object-cover border border-sand/30" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-display text-lg text-white"
                      style={{ backgroundColor: corInfo?.hex ?? "#2D5016" }}
                    >
                      {p.profile?.nome_completo?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {!p.ativo && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inativo</span>
                    )}
                    {/* Color picker */}
                    <div className="relative">
                      <button
                        onClick={() => setColorPickerId(colorPickerId === p.id ? null : p.id)}
                        className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-400 hover:text-forest transition-colors"
                        title="Alterar cor"
                      >
                        <Palette className="w-4 h-4" style={{ color: corInfo?.hex }} />
                      </button>
                      {colorPickerId === p.id && (
                        <ColorPickerPopover
                          profId={p.id}
                          currentCor={p.cor}
                          coresUsadas={coresUsadas}
                          onClose={() => setColorPickerId(null)}
                        />
                      )}
                    </div>
                    {/* Toggle ativo */}
                    <button
                      onClick={() => handleToggleAtivo(p)}
                      disabled={togglingId === p.id}
                      className={`p-1.5 rounded-lg transition-colors ${p.ativo ? "hover:bg-amber-50 text-amber-500 hover:text-amber-600" : "hover:bg-green-50 text-gray-400 hover:text-green-600"}`}
                      title={p.ativo ? "Desativar" : "Reativar"}
                    >
                      {togglingId === p.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : p.ativo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    {canManage && (
                      <>
                        <Link href={`/profissionais/${p.id}/editar`} className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors" title="Editar profissional">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setExcluindo(p)}
                          className="p-1.5 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust transition-colors"
                          title="Excluir profissional"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <h3 className="font-display text-xl text-forest mb-1">{p.profile?.nome_completo ?? "—"}</h3>
                {p.especialidade?.nome && <p className="text-sm text-rust mb-3">{p.especialidade.nome}</p>}
                {p.registro_profissional && <p className="text-xs text-forest-500 mb-3">{p.registro_profissional}</p>}
                <div className="flex items-center justify-between text-xs text-forest-500 pt-3 border-t border-sand/30 flex-wrap gap-1">
                  <span className="truncate">{p.profile?.email}</span>
                  <div className="flex flex-col items-end gap-0.5">
                    {p.valor_consulta != null && (
                      <span className="font-medium text-forest">Avulsa: R$ {formatMoney(p.valor_consulta)}</span>
                    )}
                    {p.valor_plano != null && (
                      <span className="font-medium text-forest">Plano: R$ {formatMoney(p.valor_plano)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
