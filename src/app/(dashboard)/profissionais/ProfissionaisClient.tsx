"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Pencil, Stethoscope, Plus, Trash2, Loader2, AlertTriangle, ToggleLeft, ToggleRight, Palette, Check } from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import { excluirProfissional, excluirProfissionalConfirmado, toggleAtivoProfissional, alterarCorProfissional } from "./actions";
import { PROF_CORES } from "@/lib/profCores";

interface Profissional {
  id: string;
  registro_profissional?: string | null;
  valor_plano?: number | null;
  telefone_1?: string | null;
  ativo: boolean;
  foto_url?: string | null;
  cor?: string | null;
  profile: { nome_completo: string; email: string } | null;
  especialidades?: { especialidade: { nome: string } }[] | null;
}

interface Props {
  profissionais: Profissional[];
  canManage: boolean;
  canDelete?: boolean;
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
              <p className="font-display text-lg text-forest">Desativar profissional</p>
              <p className="text-sm text-forest-600 mt-1">
                Tem certeza que deseja desativar <strong>{nome}</strong>? O profissional não aparecerá mais nas listagens ativas.
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

function formatMoney(val?: number | null) {
  if (!val && val !== 0) return null;
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ProfissionaisClient({ profissionais, canManage, canDelete }: Props) {
  const [busca, setBusca] = useState("");
  const [excluindo, setExcluindo] = useState<Profissional | null>(null);
  const [inativando, setInativando] = useState<Profissional | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [, startTransition] = useTransition();

  const coresUsadas = profissionais.map(p => p.cor).filter(Boolean) as string[];

  function executarToggle(id: string) {
    setTogglingId(id);
    startTransition(async () => {
      await toggleAtivoProfissional(id);
      setTogglingId(null);
    });
  }

  function handleToggleAtivo(p: Profissional) {
    if (p.ativo) {
      setInativando(p);
    } else {
      executarToggle(p.id);
    }
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
      {inativando && (
        <ModalConfirmarInativar
          nome={inativando.profile?.nome_completo ?? "Profissional"}
          onConfirm={() => { executarToggle(inativando.id); setInativando(null); }}
          onClose={() => setInativando(null)}
        />
      )}

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
                      <Link href={`/profissionais/${p.id}/editar`} className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors" title="Editar profissional">
                        <Pencil className="w-4 h-4" />
                      </Link>
                    )}
                    {(canDelete ?? canManage) && (
                      <button
                        onClick={() => setExcluindo(p)}
                        className="p-1.5 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust transition-colors"
                        title="Excluir profissional"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-display text-xl text-forest mb-1">{p.profile?.nome_completo ?? "—"}</h3>
                {p.especialidades && p.especialidades.length > 0 && (
                  <p className="text-sm text-rust mb-3">
                    {p.especialidades.map(e => e.especialidade.nome).join(" · ")}
                  </p>
                )}
                {p.registro_profissional && <p className="text-xs text-forest-500 mb-3">{p.registro_profissional}</p>}
                <div className="flex items-center justify-between text-xs text-forest-500 pt-3 border-t border-sand/30 flex-wrap gap-1">
                  {p.telefone_1 ? (
                    <a
                      href={`https://wa.me/${p.telefone_1.startsWith("+") ? p.telefone_1.replace(/\D/g, "") : "55" + p.telefone_1.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors truncate"
                      title="Abrir no WhatsApp"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />{p.telefone_1}
                    </a>
                  ) : (
                    <span className="truncate text-forest-400 italic">Sem telefone</span>
                  )}
                  {p.valor_plano != null && (
                    <span className="font-medium text-forest shrink-0">Plano: R$ {formatMoney(p.valor_plano)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
