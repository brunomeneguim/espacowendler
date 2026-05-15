"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addDays, addWeeks, subWeeks, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Check, UserX, XCircle,
  LayoutGrid, AlignLeft, Pencil, CalendarDays, Clock,
  DoorOpen, X, Save, Loader2, Monitor, Trash2, RotateCcw, List, Search, Cake, Stethoscope, Users, AlertTriangle,
  FileText, DollarSign, CheckCircle2, PhoneCall, CalendarPlus, User, MessageSquare,
} from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";

const Users2Icon = Users;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
import { atualizarStatusAgendamento, atualizarAgendamento, deletarAgendamentoClient, verificarHorarioIndisponivel, marcarPagamentoAgendamento } from "../agenda/actions";
import { adicionarEncaixeDireto } from "./listaEncaixeActions";
import type { Encaixe } from "./DashboardContent";
import { PROF_CORES, getCorById } from "@/lib/profCores";
import { usePrivacyMode } from "@/app/(dashboard)/PrivacyContext";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

// ── Constantes ───────────────────────────────────────────────────
const HORA_INICIO = 7;
const HORA_FIM    = 22;
const PX_POR_HORA = 60;
const TOTAL_HORAS = HORA_FIM - HORA_INICIO;

// ── Tipos ────────────────────────────────────────────────────────
type Status = "agendado" | "confirmado" | "realizado" | "finalizado" | "cancelado" | "faltou" | "ausencia";
type ViewMode = "semana" | "dia" | "lista";

interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: Status;
  observacoes?: string | null;
  tipo_agendamento?: string | null;
  pago?: boolean;
  forma_pagamento?: string | null;
  valor_sessao?: number | null;
  quantidade_sessoes?: number | null;
  paciente: { id: string; nome_completo: string; telefone?: string; valor_consulta_especial?: number | null; valor_plano_especial?: number | null } | null;
  profissional: { id: string; cor?: string | null; profile: { nome_completo: string } | null } | null;
  sala: { id: number; nome: string } | null;
}
interface Profissional { id: string; profile_id?: string | null; cor?: string | null; valor_consulta?: number | null; tempo_atendimento?: number | null; profile: { nome_completo: string } | null }
interface Paciente     { id: string; nome_completo: string; telefone?: string }
interface HorarioDisponivel { profissional_id: string; dia_semana: number; hora_inicio: string; hora_fim: string }
interface Sala         { id: number; nome: string; ordem?: number }
interface Aniversariante {
  id: string;
  nome_completo: string;
  telefone?: string | null;
  data_nascimento: string;
  tipo?: "paciente" | "profissional";
  profissional_nome?: string | null;
}

interface Props {
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  pacientes: Paciente[];
  aniversariantes: Aniversariante[];
  horariosDisponiveis: HorarioDisponivel[];
  salas: Sala[];
  weekStartStr: string;
  userRole: string;
  currentUserId?: string;
  // Reagendar externo (controlado por DashboardContent)
  reagendarInfo?: ReagendarInfo | null;
  onSetReagendarInfo?: (info: ReagendarInfo | null) => void;
  // Lista de encaixe atual (para desfazer mesmo após page refresh)
  encaixes?: Encaixe[];
  // Callbacks para sincronizar lista de encaixe
  onAddEncaixe?: (enc: Encaixe) => void;
  onRemoveEncaixe?: (id: string) => void;
}

// ── Status config ─────────────────────────────────────────────────
const STATUS: Record<Status, { label: string; card: string; dot: string; badge: string }> = {
  agendado:   { label: "Agendado",          card: "bg-blue-50 border-blue-200 text-blue-900",       dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700"    },
  confirmado: { label: "Confirmado",        card: "bg-green-50 border-green-200 text-green-900",    dot: "bg-blue-400",   badge: "bg-green-100 text-green-700"  },
  realizado:  { label: "Realizado",         card: "bg-teal-50 border-teal-200 text-teal-900",       dot: "bg-teal-500",   badge: "bg-teal-100 text-teal-700"    },
  cancelado:  { label: "Falta Justificada", card: "bg-red-50 border-red-200 text-red-800",          dot: "bg-red-400",    badge: "bg-red-100 text-red-600"      },
  faltou:     { label: "Falta Cobrada",     card: "bg-orange-50 border-orange-200 text-orange-900", dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700" },
  finalizado: { label: "Finalizado",        card: "bg-gray-50 border-gray-200 text-gray-800",       dot: "bg-white border border-gray-300",   badge: "bg-gray-100 text-gray-600"    },
  ausencia:   { label: "Ausência",          card: "bg-gray-100 border-gray-300 text-gray-600",      dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-500"    },
};

// Ordem das legendas (realizado logo à direita de agendado)
const LEGENDA_ORDEM: Status[] = ["agendado", "realizado", "confirmado", "faltou", "cancelado", "finalizado", "ausencia"];

const BORDA_PROF = PROF_CORES.map(c => c.border);
const BG_PROF    = PROF_CORES.map(c => c.bg);

// Seg a Sáb (sem domingo)
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6];

function parseTimeToMinutes(t: string) { const [h,m] = t.split(":").map(Number); return h*60+m; }

// Retorna true se a cor hex é escura (usa luminância relativa)
function isColorDark(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.5;
}

// Converte hex para rgba com transparência
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Detecção de overlap ───────────────────────────────────────────
function calcularColunas(ags: Agendamento[]) {
  const sorted = [...ags].sort((a,b)=>new Date(a.data_hora_inicio).getTime()-new Date(b.data_hora_inicio).getTime());
  const map = new Map<string,{col:number;total:number}>();
  const fimPorCol: Date[] = [];
  for (const ag of sorted) {
    const ini=new Date(ag.data_hora_inicio), fim=new Date(ag.data_hora_fim);
    let col=0; while(col<fimPorCol.length && fimPorCol[col]>ini) col++;
    fimPorCol[col]=fim; map.set(ag.id,{col,total:1});
  }
  for (const [idA,vA] of map) {
    const agA=ags.find(a=>a.id===idA)!;
    const iA=new Date(agA.data_hora_inicio).getTime(), fA=new Date(agA.data_hora_fim).getTime();
    let maxCol=vA.col;
    for (const [idB,vB] of map) {
      if (idA===idB) continue;
      const agB=ags.find(a=>a.id===idB)!;
      const iB=new Date(agB.data_hora_inicio).getTime(), fB=new Date(agB.data_hora_fim).getTime();
      if (iA<fB && fA>iB) maxCol=Math.max(maxCol,vB.col);
    }
    vA.total=maxCol+1;
  }
  return map;
}

// ── Modal de edição ───────────────────────────────────────────────
interface EditModalProps {
  ag: Agendamento;
  profissionais: Profissional[];
  pacientes: Paciente[];
  salas: Sala[];
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ ag, profissionais, pacientes, salas, onClose, onSaved }: EditModalProps) {
  const inicio = new Date(ag.data_hora_inicio);
  const fim    = new Date(ag.data_hora_fim);
  const duracaoInicial = Math.round((fim.getTime()-inicio.getTime())/60000);

  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string|null>(null);
  const [tipoAg, setTipoAg] = useState(ag.tipo_agendamento ?? "consulta_avulsa");
  const [avisoPendente, setAvisoPendente] = useState(false);
  const tzOffset = typeof window !== "undefined" ? new Date().getTimezoneOffset() : 0;
  const isAusencia = tipoAg === "ausencia";
  const bloqueiaHorario = ["ausencia", "faltou", "cancelado"].includes(ag.status);

  type PendingArgs = Parameters<typeof atualizarAgendamento>;
  const pendingArgsRef = useRef<PendingArgs | null>(null);

  function executarAtualizar(args: PendingArgs) {
    startTransition(async () => {
      const res = await atualizarAgendamento(...args);
      if (res.error) { setErro(res.error); }
      else { onSaved(); onClose(); }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);

    const profissionalId = fd.get("profissional_id") as string;
    const data           = fd.get("data") as string;
    const hora           = fd.get("hora") as string;
    const duracao        = parseInt(fd.get("duracao") as string || "60");
    const status         = isAusencia ? "ausencia" : fd.get("status") as string;
    const observacoes    = fd.get("observacoes") as string || null;
    const pacienteId     = isAusencia ? null : fd.get("paciente_id") as string;
    const salaId         = fd.get("sala_id") as string || null;

    const args: PendingArgs = [ag.id, profissionalId, pacienteId, salaId, data, hora, duracao, status, observacoes, tzOffset, tipoAg];

    // Verificar horário indisponível (apenas para consultas/planos)
    if (!isAusencia) {
      const { conflito } = await verificarHorarioIndisponivel(profissionalId, data, hora);
      if (conflito) {
        pendingArgsRef.current = args;
        setAvisoPendente(true);
        return;
      }
    }

    executarAtualizar(args);
  }

  return (
    <>
      {/* Modal aviso horário indisponível */}
      {avisoPendente && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-display text-base text-forest">Horário indisponível</h3>
                  <p className="text-sm text-forest-600 mt-1">
                    Este profissional não pode atender pacientes nesse horário. Agendar mesmo assim?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const args = pendingArgsRef.current;
                    if (!args) return;
                    pendingArgsRef.current = null;
                    setAvisoPendente(false);
                    executarAtualizar(args);
                  }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sim, agendar
                </button>
                <button
                  type="button"
                  onClick={() => { setAvisoPendente(false); pendingArgsRef.current = null; }}
                  className="btn-secondary flex-1"
                >
                  Não, cancelar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand/30 bg-cream/60">
          <div>
            <p className="text-xs uppercase tracking-wider text-forest-500">Editar agendamento</p>
            <p className="font-display text-lg text-forest leading-tight">{ag.paciente?.nome_completo ?? (isAusencia ? "Ausência" : "—")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest/10 text-forest-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="edit-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <ErrorBanner message={erro} />

          <div>
            <label className="label">Tipo de Agendamento</label>
            <select className="input-field" value={tipoAg} onChange={e => setTipoAg(e.target.value)}>
              <option value="consulta_avulsa">Consulta Avulsa</option>
              <option value="plano_mensal">Plano Mensal</option>
              <option value="ausencia">Ausência</option>
            </select>
          </div>

          {!isAusencia && (
            <div>
              <label className="label">Paciente</label>
              <select name="paciente_id" required className="input-field" defaultValue={ag.paciente?.id ?? ""}>
                <option value="" disabled>Selecione</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label">Profissional</label>
            <select name="profissional_id" required className="input-field" defaultValue={ag.profissional?.id ?? ""}>
              <option value="" disabled>Selecione</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.profile?.nome_completo ?? p.id}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Sala</label>
            <select name="sala_id" className="input-field" defaultValue={ag.sala?.id ?? ""}>
              <option value="">Sem sala</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          {!bloqueiaHorario && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data</label>
                <input name="data" type="date" required className="input-field" defaultValue={format(inicio, "yyyy-MM-dd")} />
              </div>
              <div>
                <label className="label">Horário</label>
                <input name="hora" type="time" required className="input-field" defaultValue={format(inicio, "HH:mm")} />
              </div>
            </div>
          )}
          {bloqueiaHorario && (
            <>
              <input type="hidden" name="data" value={format(inicio, "yyyy-MM-dd")} />
              <input type="hidden" name="hora" value={format(inicio, "HH:mm")} />
            </>
          )}

          {bloqueiaHorario && (
            <input type="hidden" name="duracao" value={duracaoInicial} />
          )}
          <div className="grid grid-cols-2 gap-3">
            {!bloqueiaHorario && (
            <div>
              <label className="label">Duração (min)</label>
              <input name="duracao" type="number" min="15" step="5" required className="input-field" defaultValue={duracaoInicial} />
            </div>
            )}
            {!isAusencia && (
              <div>
                <label className="label">Status</label>
                <select name="status" required className="input-field" defaultValue={ag.status === "ausencia" ? "agendado" : ag.status}>
                  <option value="agendado">Agendado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Falta Justificada</option>
                  <option value="faltou">Falta Cobrada</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="label">Observações <span className="text-forest-400">(opcional)</span></label>
            <textarea name="observacoes" rows={3} className="input-field resize-none" defaultValue={ag.observacoes ?? ""} />
          </div>

          {/* Valor da sessão — informativo com fallback para preço do paciente/profissional */}
          {ag.tipo_agendamento !== "ausencia" && (() => {
            // Cadeia de prioridade: valor gravado → preço especial do paciente → preço padrão do profissional
            const profModal = profissionais.find(p => p.id === ag.profissional?.id);
            const valorFallback = ag.tipo_agendamento === "plano_mensal"
              ? (ag.paciente?.valor_plano_especial ?? null)
              : (ag.paciente?.valor_consulta_especial ?? profModal?.valor_consulta ?? null);
            const valorExibido = ag.valor_sessao ?? valorFallback;
            const isFallback   = ag.valor_sessao == null && valorFallback != null;
            return (
              <div className="rounded-xl border border-sand/40 px-4 py-3 bg-cream/40 flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-forest-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-forest-500 leading-tight">
                    Valor da sessão{isFallback && <span className="ml-1 text-amber-600">(padrão)</span>}
                  </p>
                  <p className="text-sm font-semibold text-forest leading-tight">
                    {valorExibido != null
                      ? Number(valorExibido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "Não definido"}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  ag.pago
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {ag.pago ? "Pago" : "Pendente"}
                </span>
              </div>
            );
          })()}
        </form>

        <div className="px-6 py-4 border-t border-sand/30 bg-cream/40 flex gap-3">
          <button type="submit" form="edit-modal-form" disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </div>
    </>
  );
}

// ── Card de agendamento ───────────────────────────────────────────
const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX",
  cartao_credito: "Cartão crédito", cartao_debito: "Cartão débito",
  transferencia: "Transferência", outros: "Outros",
};

interface CardProps {
  ag: Agendamento;
  style: React.CSSProperties;
  bordaProf: string;
  profHex: string;
  profValorConsulta?: number | null;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: Status) => void;
  onPayment: (id: string, forma: string, valor: number | null, outrosDesc?: string, qtd?: number) => void;
  onUndoPayment?: (id: string) => void;
  onResizeStart: (agId: string, startY: number, durationMin: number, el: HTMLDivElement) => void;
  onMoveStart?: (agId: string, startMouseY: number, originalTopPx: number, durationMin: number, el: HTMLDivElement) => void;
  pending: boolean;
  canEdit: boolean;
  canMove?: boolean;
  expanded: boolean;
  onExpand: () => void;
  privacyMode: boolean;
}

function formatCentavos(c: number): string {
  return (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FORMAS_PAGAMENTO = [
  { value: "pix",             label: "PIX"      },
  { value: "dinheiro",        label: "Dinheiro" },
  { value: "cartao_credito",  label: "Crédito"  },
  { value: "cartao_debito",   label: "Débito"   },
  { value: "transferencia",   label: "Transf."  },
  { value: "outros",          label: "Outros"   },
];

function PaymentForm({
  agId,
  defaultValor,
  valorUnitario,
  onConfirm,
}: {
  agId: string;
  defaultValor?: number | null;
  valorUnitario?: number | null;
  onConfirm: (forma: string, valor: number | null, outrosDesc?: string, qtd?: number) => void;
}) {
  const [forma, setForma] = useState("pix");
  const [outrosDesc, setOutrosDesc] = useState("");

  // Valor unitário de referência (precisa ser declarado antes dos estados que dependem dele)
  const unitCentavos = valorUnitario != null && valorUnitario > 0
    ? Math.round(valorUnitario * 100)
    : 0;

  // Estado separado para reais e centavos — entrada natural da esquerda para direita
  const [intStr, setIntStr] = useState<string>(() => {
    const c = defaultValor != null ? Math.round(defaultValor * 100) : 0;
    return String(Math.floor(c / 100));
  });
  const [decStr, setDecStr] = useState<string>(() => {
    const c = defaultValor != null ? Math.round(defaultValor * 100) : 0;
    return String(c % 100).padStart(2, "0");
  });
  const [hasDecimal, setHasDecimal] = useState(false);

  // Quantidade como estado — não re-derivada do valor digitado pelo usuário
  const [quantidade, setQuantidade] = useState<number>(() =>
    unitCentavos > 0 && defaultValor != null
      ? Math.max(1, Math.round(Math.round(defaultValor * 100) / unitCentavos))
      : 1
  );

  // Sincroniza quando defaultValor muda (ex.: card reabre com outro agendamento)
  useEffect(() => {
    const c = defaultValor != null ? Math.round(defaultValor * 100) : 0;
    setIntStr(String(Math.floor(c / 100)));
    setDecStr(String(c % 100).padStart(2, "0"));
    setHasDecimal(false);
    setQuantidade(unitCentavos > 0 && c > 0
      ? Math.max(1, Math.round(c / unitCentavos))
      : 1
    );
  }, [defaultValor, unitCentavos]);

  // Valor exibido no input (com separador de milhar)
  const displayValor = hasDecimal
    ? `${(parseInt(intStr || "0") || 0).toLocaleString("pt-BR")},${decStr}`
    : `${(parseInt(intStr || "0") || 0).toLocaleString("pt-BR")},${decStr.padEnd(2, "0").slice(0, 2)}`;

  // Centavos total derivado (para cálculos internos)
  const centavos = (parseInt(intStr || "0") || 0) * 100
    + (parseInt(decStr.padEnd(2, "0").slice(0, 2)) || 0);
  const valorNum = centavos > 0 ? centavos / 100 : null;

  function handleValorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const inp = e.currentTarget;
    const allSelected = inp.selectionStart === 0 && inp.selectionEnd === inp.value.length;

    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      if (allSelected) {
        // Selecionou tudo: reinicia com este dígito nos reais
        setIntStr(e.key === "0" ? "0" : e.key);
        setDecStr("00");
        setHasDecimal(false);
      } else if (!hasDecimal) {
        // Modo reais: constrói da esquerda para direita (máx 7 dígitos)
        setIntStr(prev => {
          const next = prev === "0" ? e.key : prev + e.key;
          return next.length <= 7 ? next : prev;
        });
      } else {
        // Modo centavos: máximo 2 dígitos
        setDecStr(prev => (prev.length < 2 ? prev + e.key : prev));
      }
    } else if (e.key === "," || e.key === ".") {
      e.preventDefault();
      if (!hasDecimal) {
        setHasDecimal(true);
        setDecStr("");
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (allSelected) {
        setIntStr("0"); setDecStr("00"); setHasDecimal(false);
      } else if (hasDecimal && decStr.length > 0) {
        setDecStr(prev => prev.slice(0, -1));
      } else if (hasDecimal) {
        setHasDecimal(false);
        setDecStr("00");
      } else {
        setIntStr(prev => (prev.length > 1 ? prev.slice(0, -1) : "0"));
      }
    } else if (e.key === "Delete") {
      e.preventDefault();
      setIntStr("0"); setDecStr("00"); setHasDecimal(false);
    }
  }

  // Quando o usuário digita a quantidade, recalcula com o valor atual do campo
  function handleQtdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newQtd = Math.max(1, parseInt(e.target.value) || 1);
    // Por sessão = valor atual ÷ quantidade atual (não usa valorUnitario original)
    const perSession = quantidade > 0 && centavos > 0
      ? Math.round(centavos / quantidade)
      : unitCentavos;
    if (perSession > 0) {
      const total = newQtd * perSession;
      setIntStr(String(Math.floor(total / 100)));
      setDecStr(String(total % 100).padStart(2, "0"));
      setHasDecimal(false);
    }
    setQuantidade(newQtd);
  }

  return (
    <div className="px-2.5 py-2 space-y-2" onClick={e => e.stopPropagation()}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Registrar pagamento</p>

      {/* Valor + Quantidade lado a lado */}
      <div className="flex items-center gap-1.5">
        {/* Valor — compacto */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-xs text-gray-400 shrink-0">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={displayValor}
            onChange={() => {}}
            onFocus={e => e.target.select()}
            onKeyDown={handleValorKeyDown}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-forest/30 text-right tabular-nums"
          />
        </div>

        {/* Quantidade de sessões */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-gray-400 whitespace-nowrap">Sessões</span>
          <input
            type="number"
            min={1}
            max={99}
            value={quantidade}
            onChange={handleQtdChange}
            className="w-14 text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-forest/30 text-center tabular-nums"
          />
        </div>
      </div>

      {/* Método de pagamento */}
      <div className="grid grid-cols-3 gap-1">
        {FORMAS_PAGAMENTO.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setForma(f.value)}
            className={`py-1 rounded-full text-xs font-medium transition-colors text-center ${
              forma === f.value
                ? "bg-forest text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Campo livre quando "Outros" */}
      {forma === "outros" && (
        <input
          type="text"
          placeholder="Descreva o método de pagamento…"
          value={outrosDesc}
          onChange={e => setOutrosDesc(e.target.value)}
          className="w-full text-xs border border-amber-200 rounded-lg px-2 py-1 bg-amber-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder:text-gray-400"
        />
      )}

      <button
        type="button"
        onClick={() => onConfirm(forma, valorNum, forma === "outros" ? outrosDesc.trim() || undefined : undefined, quantidade)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
      >
        <Check className="w-3 h-3" /> Confirmar pagamento
      </button>
    </div>
  );
}

// ── Modal: Falta Cobrada ──────────────────────────────────────────
function FaltaCobradaModal({ pacienteNome, onClose }: { pacienteNome: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <PhoneCall className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-display text-base text-forest">Cobrança de falta</h3>
              <p className="text-sm text-forest-600 mt-1">
                Mandar mensagem para <span className="font-semibold">{pacienteNome}</span>, referente à cobrança da falta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Cobrança Efetuada
          </button>
        </div>
      </div>
    </>
  );
}

// ── Modal: Falta Justificada ──────────────────────────────────────
function FaltaJustificadaModal({
  pacienteNome,
  onListaEncaixe,
  onReagendar,
  onClose,
}: {
  pacienteNome: string;
  onListaEncaixe: () => void;
  onReagendar: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <CalendarPlus className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-display text-base text-forest">Falta justificada registrada</h3>
              <p className="text-sm text-forest-500 mt-0.5">O que deseja fazer com o horário de <span className="font-semibold">{pacienteNome}</span>?</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onListaEncaixe}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-rust text-white text-sm font-medium hover:bg-rust/90 transition-colors"
            >
              <List className="w-4 h-4" /> Lista de Encaixe
            </button>
            <button
              type="button"
              onClick={onReagendar}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-forest text-cream text-sm font-medium hover:bg-forest/90 transition-colors"
            >
              <CalendarPlus className="w-4 h-4" /> Reagendar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-peach text-rust text-sm font-medium hover:bg-peach/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function AgendamentoCard({ ag, style, bordaProf, profHex, profValorConsulta, onEdit, onDelete, onStatus, onPayment, onUndoPayment, onResizeStart, onMoveStart, pending, canEdit, canMove, expanded, onExpand, privacyMode }: CardProps) {
  const cfg = STATUS[ag.status] ?? STATUS.agendado;
  const ativo = ag.status === "agendado" || ag.status === "confirmado";

  // Valor unitário efetivo: preço especial do paciente → preço padrão do profissional
  const valorUnitarioEfetivo: number | null = ag.tipo_agendamento === "plano_mensal"
    ? (ag.paciente?.valor_plano_especial ?? profValorConsulta ?? null)
    : (ag.paciente?.valor_consulta_especial ?? profValorConsulta ?? null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!expanded) return;

    function updatePos() {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const POPUP_WIDTH = Math.max(220, rect.width);
      const left = Math.max(4, Math.min(rect.left - 1, window.innerWidth - POPUP_WIDTH - 8));
      const pos: React.CSSProperties = { position: "fixed", left, width: POPUP_WIDTH, zIndex: 9999 };
      if (window.innerHeight - rect.bottom < 360) {
        pos.bottom = window.innerHeight - rect.top + 4;
      } else {
        pos.top = rect.bottom + 4;
      }
      setPopupPos(pos);
    }

    updatePos();
    // Atualiza posição ao rolar para o painel seguir o card
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [expanded]);

  const noColor = profHex === "#ffffff";
  const bgColor =
    ag.status === "faltou"    ? "#dc2626" :
    ag.status === "cancelado" ? "#f8f8f8" :
    ag.status === "ausencia"  ? "#f3f4f6" :
    noColor ? "#ffffff" : profHex;
  const borderAccent = noColor ? "#d1d5db" : profHex;
  const borderGeneral = noColor ? "#e5e7eb" : profHex;
  const textColor = isColorDark(bgColor) ? "#ffffff" : "#1a1a1a";
  const textMuted = isColorDark(bgColor) ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.5)";

  const durationMin = Math.round((new Date(ag.data_hora_fim).getTime() - new Date(ag.data_hora_inicio).getTime()) / 60000);

  const canBeMoved = canMove && !["realizado", "finalizado", "faltou", "cancelado", "ausencia"].includes(ag.status);

  return (
    <div
      ref={cardRef}
      style={{ ...style, backgroundColor: bgColor, borderLeftColor: borderAccent, borderColor: borderGeneral, borderLeftWidth: '8px', boxShadow: ag.status === "finalizado" ? "inset 0 0 0 1000px rgba(0,0,0,0.22)" : undefined }}
      className={`absolute rounded border transition-shadow hover:shadow-md select-none overflow-hidden ${canBeMoved ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${expanded ? "z-30 shadow-lg" : "z-10"} ${pending ? "pointer-events-none" : ""}`}
      onClick={onExpand}
      onMouseDown={e => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest("[data-resize]")) return;
        if ((e.target as HTMLElement).closest("button")) return;
        if (expanded) return;
        if (!canBeMoved || !onMoveStart || !cardRef.current) return;
        const topPx = typeof style.top === "number" ? style.top : parseFloat(String(style.top || "0"));
        onMoveStart(ag.id, e.clientY, topPx, durationMin, cardRef.current);
      }}
    >
      {/* Ícones canto superior direito: check (confirmado/finalizado) + observação */}
      <div className="absolute top-0.5 right-0.5 z-10 flex items-center gap-0.5">
        {ag.observacoes && (
          <span
            title={ag.observacoes}
            className="cursor-help"
            style={{ color: (ag.status === "finalizado" || isColorDark(bgColor)) ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.60)" }}
          >
            <MessageSquare className="w-3 h-3" strokeWidth={2.5} />
          </span>
        )}
        {(ag.status === "confirmado" || ag.status === "finalizado") && (
          <span className="pointer-events-none">
            <Check
              className="w-3 h-3"
              style={{ color: (ag.status === "finalizado" || isColorDark(bgColor)) ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.75)" }}
              strokeWidth={3}
            />
          </span>
        )}
      </div>
      {/* Ícones canto inferior direito: ⚠ inadimplente + $ pagamento */}
      {ag.status !== "ausencia" && ag.status !== "cancelado" && (
        <div className="absolute bottom-1 right-1 z-10 pointer-events-none flex items-center gap-0.5">
          {ag.status === "finalizado" && !ag.pago && (
            <span title="Inadimplente — pagamento pendente">
              <AlertTriangle className="w-3 h-3 text-amber-400 drop-shadow" strokeWidth={2.5} />
            </span>
          )}
          <span
            title={ag.pago ? `Pago${ag.forma_pagamento ? ` · ${FORMA_LABELS[ag.forma_pagamento] ?? ag.forma_pagamento}` : ""}` : "Pagamento pendente"}
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: ag.pago ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.80)", boxShadow: "0 0 0 1.5px rgba(0,0,0,0.35)" }}
          >
            <DollarSign className="w-2.5 h-2.5 text-white" />
          </span>
        </div>
      )}
      <div className="px-1.5 pt-0.5 pb-5 leading-tight flex flex-col gap-px">
        {/* Linha 1: horário + paciente */}
        <div className="flex items-center gap-0.5 pr-6 min-w-0">
          <User className="w-2.5 h-2.5 shrink-0 opacity-60" style={{ color: textColor }} strokeWidth={2} />
          <p className="text-xs font-semibold truncate" style={{ color: textColor }}>
            {format(new Date(ag.data_hora_inicio), "HH:mm")} {privacyMode ? "● ● ●" : (ag.paciente?.nome_completo ?? "—")}
          </p>
        </div>
        {/* Linha 2: profissional (oculto no modo privacidade) */}
        {!privacyMode && (
          <div className="flex items-center gap-0.5 pr-6 min-w-0">
            <Stethoscope className="w-2.5 h-2.5 shrink-0 opacity-60" style={{ color: textMuted }} strokeWidth={2} />
            <p className="text-[10px] truncate" style={{ color: textMuted }}>
              {ag.profissional?.profile?.nome_completo}
            </p>
          </div>
        )}
      </div>

      {expanded && (
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
          style={popupPos}
          onClick={e => e.stopPropagation()}
        >
          {/* Info do agendamento */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{privacyMode ? "● ● ●" : (ag.paciente?.nome_completo ?? "—")}</p>
              <p className="text-[11px] text-gray-400 truncate">
                {format(new Date(ag.data_hora_inicio), "HH:mm")} – {format(new Date(ag.data_hora_fim), "HH:mm")}
              </p>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 whitespace-nowrap ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>

          {/* Botões de ação — linha de ícones */}
          <div className="p-2 flex flex-col gap-1">
            <div className="flex gap-1">
              {ativo && ag.status === "agendado" && (
                <button title="Confirmar presença" onClick={() => onStatus("confirmado")} className="flex-1 flex items-center justify-center h-8 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                  <Check className="w-4 h-4" />
                </button>
              )}
              {ag.status === "confirmado" && (
                <button
                  title="Finalizar sessão"
                  onClick={() => onStatus("finalizado")}
                  className="flex-1 flex items-center justify-center h-8 rounded-lg transition-colors bg-teal-50 text-teal-700 hover:bg-teal-100"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
              {ativo && (
                <>
                  <button title="Falta Cobrada" onClick={() => onStatus("faltou")} className="flex-1 flex items-center justify-center h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                    <UserX className="w-4 h-4" />
                  </button>
                  <button title="Falta Justificada" onClick={() => onStatus("cancelado")} className="flex-1 flex items-center justify-center h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
              {(ag.status === "faltou" || ag.status === "cancelado" || ag.status === "confirmado" || ag.status === "ausencia" || ag.status === "finalizado" || ag.status === "realizado") && (
                <button
                  title="Desfazer"
                  onClick={() => onStatus(ag.status === "realizado" ? "confirmado" : "agendado")}
                  className="flex-1 flex items-center justify-center h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              {canEdit && (
                <>
                  <button title="Editar" onClick={onEdit} className="flex-1 flex items-center justify-center h-8 rounded-lg bg-forest/10 text-forest hover:bg-forest/20 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button title="Excluir" onClick={onDelete} className="flex-1 flex items-center justify-center h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Pagamento */}
            {ag.status !== "ausencia" && (
              <div className="border-t border-gray-100 mt-0.5 pt-1">
                {ag.status === "cancelado" ? (
                  /* Falta justificada — sem cobrança */
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 italic">Cobrança não necessária</p>
                  </div>
                ) : ag.pago ? (
                  <div className="flex items-center gap-2.5 px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <DollarSign className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-green-700 leading-tight">
                        Sessão paga
                        {ag.valor_sessao != null && (
                          <span className="ml-1.5 font-bold">
                            {Number(ag.valor_sessao).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        )}
                      </p>
                      {ag.forma_pagamento && (
                        <p className="text-[10px] text-gray-400 leading-tight">{FORMA_LABELS[ag.forma_pagamento] ?? ag.forma_pagamento}</p>
                      )}
                    </div>
                    {onUndoPayment && (
                      <button
                        title="Desfazer pagamento"
                        onClick={e => { e.stopPropagation(); onUndoPayment(ag.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-forest-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {ag.status === "finalizado" && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-t border-amber-100">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-700 font-medium">Sessão finalizada sem pagamento — inadimplente</p>
                      </div>
                    )}
                    <PaymentForm
                      agId={ag.id}
                      defaultValor={ag.valor_sessao ?? valorUnitarioEfetivo}
                      valorUnitario={valorUnitarioEfetivo}
                      onConfirm={(forma, valor, outrosDesc, qtd) => onPayment(ag.id, forma, valor, outrosDesc, qtd)}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Handle de resize — bloqueado para realizado, finalizado, ausencia e faltas */}
      {canEdit && !["finalizado", "realizado", "ausencia", "faltou", "cancelado"].includes(ag.status) && (
        <div
          data-resize="true"
          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize flex items-center justify-center group/resize"
          onMouseDown={e => {
            e.stopPropagation();
            e.preventDefault();
            if (cardRef.current) onResizeStart(ag.id, e.clientY, durationMin, cardRef.current);
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="w-6 h-0.5 rounded-full bg-gray-400/50 group-hover/resize:bg-gray-600/70 transition-colors" />
        </div>
      )}
    </div>
  );
}

// ── Slot vazio clicável ───────────────────────────────────────────
interface ReagendarInfo {
  pacienteId?: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  encaixeId?: string;
  // Dados do ag original para reagendamento automático
  salaId?: number | null;
  duracaoMin?: number;
  tipoAgendamento?: string;
  observacoes?: string | null;
}

function SlotVazio({
  dia, hora, salaId,
  reagendarInfo, onReagendarSlotClick,
  leftPct = 0, widthPct = 100,
}: {
  dia: Date; hora: number; salaId: number | null;
  reagendarInfo?: ReagendarInfo | null;
  onReagendarSlotClick?: (dataStr: string, horaStr: string) => void;
  leftPct?: number; widthPct?: number;
}) {
  const dataStr = format(dia, "yyyy-MM-dd");
  const horaStr = `${String(hora).padStart(2,"0")}:00`;
  const posStyle: React.CSSProperties = {
    top: (hora - HORA_INICIO) * PX_POR_HORA + 1,
    height: PX_POR_HORA - 2,
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    zIndex: 1,
  };

  if (reagendarInfo && onReagendarSlotClick) {
    // Modo reagendar com dados completos → agenda direto sem formulário
    if (reagendarInfo.duracaoMin !== undefined) {
      return (
        <button
          onClick={() => onReagendarSlotClick(dataStr, horaStr)}
          className="absolute flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group border-2 border-dashed rounded border-blue-300 hover:bg-blue-50 hover:border-blue-500"
          style={posStyle}
          title={`Reagendar ${reagendarInfo.pacienteNome} às ${horaStr}`}
        >
          <span className="flex items-center gap-1 text-xs text-blue-500 group-hover:text-blue-700 font-medium">
            <CalendarPlus className="w-3.5 h-3.5" /> {horaStr}
          </span>
        </button>
      );
    }
    // Modo reagendar legado (sem dados do ag): navega para formulário
    const params = new URLSearchParams({ data: dataStr, hora: horaStr });
    if (salaId) params.set("sala_id", String(salaId));
    if (reagendarInfo.pacienteId) params.set("paciente_id", reagendarInfo.pacienteId);
    if (reagendarInfo.pacienteNome) params.set("paciente_nome", reagendarInfo.pacienteNome);
    params.set("profissional_id", reagendarInfo.profissionalId);
    if (reagendarInfo.encaixeId) params.set("encaixe_id", reagendarInfo.encaixeId);
    const href = `/agenda/novo?${params.toString()}`;
    return (
      <Link
        href={href}
        onClick={() => onReagendarSlotClick(dataStr, horaStr)}
        className="absolute flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group border-2 border-dashed rounded border-blue-300 hover:bg-blue-50 hover:border-blue-500"
        style={posStyle}
        title={`Reagendar ${reagendarInfo.pacienteNome} às ${horaStr}`}
      >
        <span className="flex items-center gap-1 text-xs text-blue-500 group-hover:text-blue-700 font-medium">
          <CalendarPlus className="w-3.5 h-3.5" /> {horaStr}
        </span>
      </Link>
    );
  }

  const href = `/agenda/novo?data=${dataStr}&hora=${horaStr}${salaId ? `&sala_id=${salaId}` : ""}`;
  return (
    <Link
      href={href}
      className="absolute flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group border border-dashed rounded border-gray-200 hover:bg-forest/5 hover:border-forest/30"
      style={posStyle}
      title={`Agendar às ${horaStr}`}
    >
      <span className="flex items-center gap-1 text-xs text-forest/60 group-hover:text-forest font-medium">
        <Plus className="w-3.5 h-3.5" /> {horaStr}
      </span>
    </Link>
  );
}

// ── Coluna de um dia ──────────────────────────────────────────────
interface ColunaProps {
  dia: Date;
  ags: Agendamento[];
  agsOutros?: Agendamento[]; // agendamentos de outros profissionais (para mostrar "Horário Indisponível")
  horariosParaDia: HorarioDisponivel[];
  mostrarHorarios: boolean;
  profColorMap: Map<string,string>;
  profHexMap: Map<string,string>;
  profValorConsultaMap: Map<string, number | null>;
  onEdit: (ag: Agendamento) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, s: Status) => void;
  onPayment: (id: string, forma: string, valor: number | null, outrosDesc?: string, qtd?: number) => void;
  onUndoPayment?: (id: string) => void;
  onResizeStart: (agId: string, startY: number, durationMin: number, el: HTMLDivElement) => void;
  onMoveStart?: (agId: string, startMouseY: number, originalTopPx: number, durationMin: number, el: HTMLDivElement, dia: Date) => void;
  pending: boolean;
  canEdit: boolean;
  salaId: number | null;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  privacyMode: boolean;
  reagendarInfo?: ReagendarInfo | null;
  onReagendarSlotClick?: (dataStr: string, horaStr: string) => void;
}

function DiaColuna({ dia, ags, agsOutros, horariosParaDia, mostrarHorarios, profColorMap, profHexMap, profValorConsultaMap, onEdit, onDelete, onStatus, onPayment, onUndoPayment, onResizeStart, onMoveStart, pending, canEdit, salaId, expandedId, onExpand, privacyMode, reagendarInfo, onReagendarSlotClick }: ColunaProps) {
  const colMap = calcularColunas(ags);
  // Injeta dia no onMoveStart para que o handler pai saiba em qual coluna o drag começou
  const onMoveStartWithDia = onMoveStart
    ? (agId: string, startY: number, topPx: number, durMin: number, el: HTMLDivElement) =>
        onMoveStart(agId, startY, topPx, durMin, el, dia)
    : undefined;
  const horas = Array.from({ length: TOTAL_HORAS }, (_, i) => HORA_INICIO + i);
  // Slots com card de meia largura (faltou/cancelado) mas sem card normal por cima
  const slotsMetade = new Set(
    ags.filter(a => ["cancelado","faltou","ausencia"].includes(a.status))
       .map(a => new Date(a.data_hora_inicio).getHours())
  );
  const slotsOcupados = new Set(
    ags.filter(a=>!["cancelado","faltou","ausencia"].includes(a.status))
       .map(a => new Date(a.data_hora_inicio).getHours())
  );

  return (
    <div className="relative flex-1 min-w-0" style={{ height: TOTAL_HORAS * PX_POR_HORA }}>
      {horas.map(h => (
        <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top:(h-HORA_INICIO)*PX_POR_HORA }} />
      ))}

      {mostrarHorarios && horariosParaDia.map((h,i) => {
        const startMin = parseTimeToMinutes(h.hora_inicio) - HORA_INICIO*60;
        const endMin   = parseTimeToMinutes(h.hora_fim)   - HORA_INICIO*60;
        if (startMin >= TOTAL_HORAS*60 || endMin <= 0) return null;
        const top    = (Math.max(0, startMin)/60)*PX_POR_HORA;
        const height = ((Math.min(TOTAL_HORAS*60, endMin)-Math.max(0,startMin))/60)*PX_POR_HORA;
        return <div key={i} className="absolute left-0 right-0 bg-green-50 border-l-2 border-green-200" style={{ top, height, zIndex:0 }} />;
      })}

      {horas.map(h => {
        if (slotsOcupados.has(h)) return null;
        const isMetade = slotsMetade.has(h);
        return (
          <SlotVazio key={h} dia={dia} hora={h} salaId={salaId}
            reagendarInfo={reagendarInfo} onReagendarSlotClick={onReagendarSlotClick}
            leftPct={isMetade ? 50 : 0} widthPct={isMetade ? 50 : 100}
          />
        );
      })}

      {ags.map(ag => {
        const ini = new Date(ag.data_hora_inicio), fim = new Date(ag.data_hora_fim);
        const inicioMin = (ini.getHours()-HORA_INICIO)*60 + ini.getMinutes();
        const duracaoMin = (fim.getTime()-ini.getTime())/60000;
        const top = (inicioMin/60)*PX_POR_HORA;
        const height = Math.max(22, (duracaoMin/60)*PX_POR_HORA - 2);
        const isAF = ["ausencia", "faltou", "cancelado"].includes(ag.status);
        const agIni = ini.getTime(), agFim = fim.getTime();
        const overlaps = ags.filter(o => {
          if (o.id === ag.id) return false;
          return new Date(o.data_hora_inicio).getTime() < agFim && new Date(o.data_hora_fim).getTime() > agIni;
        });
        const normalOverlaps = overlaps.filter(o => !["ausencia","faltou","cancelado"].includes(o.status));
        const afOverlaps    = overlaps.filter(o =>  ["ausencia","faltou","cancelado"].includes(o.status));

        let cardLeft: string, cardWidth: string;
        if (isAF && normalOverlaps.length > 0) {
          // AF card alongside normal cards → always left half, sub-divided among AF cards
          const allAF = [ag, ...afOverlaps].sort((a,b) => a.id < b.id ? -1 : 1);
          const idx = allAF.findIndex(a => a.id === ag.id);
          const tot = allAF.length;
          cardLeft  = `${(idx / tot) * 50}%`;
          cardWidth = `calc(${50 / tot}% - 2px)`;
        } else if (!isAF && afOverlaps.length > 0) {
          // Normal card alongside AF cards → always right half, sub-divided among normal cards
          const allNormal = [ag, ...normalOverlaps].sort((a,b) => a.id < b.id ? -1 : 1);
          const idx = allNormal.findIndex(a => a.id === ag.id);
          const tot = allNormal.length;
          cardLeft  = `${50 + (idx / tot) * 50}%`;
          cardWidth = `calc(${50 / tot}% - 2px)`;
        } else {
          // Homogeneous overlap (all AF or all normal): regular column split
          const { col, total } = colMap.get(ag.id) ?? { col:0, total:1 };
          cardLeft  = `${(col / total) * 100}%`;
          cardWidth = isAF && total === 1
            ? "calc(50% - 2px)"                      // solo AF card → left half
            : `calc(${100 / total}% - 2px)`;         // multiple of same type → full split
        }
        return (
          <AgendamentoCard
            key={ag.id}
            ag={ag}
            style={{ top:Math.max(0,top), height, left: cardLeft, width: cardWidth }}
            bordaProf={profColorMap.get(ag.profissional?.id ?? "") ?? BORDA_PROF[0]}
            profHex={ag.profissional?.cor ? getCorById(ag.profissional.cor).hex : "#ffffff"}
            profValorConsulta={profValorConsultaMap.get(ag.profissional?.id ?? "")}
            onEdit={() => onEdit(ag)}
            onDelete={() => onDelete(ag.id)}
            onStatus={s => onStatus(ag.id, s)}
            onPayment={onPayment}
            onUndoPayment={onUndoPayment}
            onResizeStart={onResizeStart}
            onMoveStart={onMoveStartWithDia}
            pending={pending}
            canEdit={canEdit}
            canMove={canEdit}
            expanded={expandedId === ag.id}
            onExpand={() => onExpand(expandedId === ag.id ? null : ag.id)}
            privacyMode={privacyMode}
          />
        );
      })}

      {/* Cards mascarados para agendamentos de OUTROS profissionais (privacidade) */}
      {(agsOutros ?? []).map(ag => {
        const ini = new Date(ag.data_hora_inicio), fim = new Date(ag.data_hora_fim);
        const inicioMin = (ini.getHours()-HORA_INICIO)*60 + ini.getMinutes();
        const duracaoMin = (fim.getTime()-ini.getTime())/60000;
        const top = (inicioMin/60)*PX_POR_HORA;
        const height = Math.max(22, (duracaoMin/60)*PX_POR_HORA - 2);
        return (
          <div
            key={`outro-${ag.id}`}
            className="absolute left-0.5 right-0.5 rounded border-l-4 border overflow-hidden cursor-default select-none"
            style={{ top: Math.max(0, top), height, zIndex: 10,
              backgroundColor: "#fff1f2", borderLeftColor: "#f87171", borderColor: "#fecaca" }}
          >
            <div className="px-1.5 pt-0.5 pb-4 leading-tight flex flex-col gap-px">
              <p className="text-xs font-semibold truncate pr-3 text-red-700">
                {format(ini, "HH:mm")} Horário Indisponível
              </p>
              <div className="flex items-center gap-0.5 min-w-0">
                <Stethoscope className="w-2.5 h-2.5 shrink-0 opacity-60 text-red-400" strokeWidth={2} />
                <p className="text-[10px] truncate text-red-400">
                  {ag.profissional?.profile?.nome_completo}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Status badge styles para lista view ──────────────────────────
const STATUS_BADGE_LISTA: Record<string, string> = {
  agendado:   "bg-blue-100 text-blue-700",
  confirmado: "bg-green-100 text-green-700",
  realizado:  "bg-teal-100 text-teal-700",
  finalizado: "bg-gray-100 text-gray-600",
  cancelado:  "bg-red-100 text-red-600",
  faltou:     "bg-orange-100 text-orange-700",
};

// ── Espelho de agendamento ────────────────────────────────────────
function EspelhoModal({ profissionais, agendamentos, horariosDisponiveis, salas, weekStart, userRole, currentUserId, onClose }: {
  profissionais: Profissional[];
  agendamentos: Agendamento[];
  horariosDisponiveis: HorarioDisponivel[];
  salas: Sala[];
  weekStart: Date;
  userRole?: string;
  currentUserId?: string;
  onClose: () => void;
}) {
  const isProfissional = userRole === "profissional";
  // Sempre tenta encontrar o próprio registro de profissional (funciona para qualquer papel, incluindo admin)
  const profissionalPropio = profissionais.find(p => p.profile_id === currentUserId) ?? null;
  const defaultProfId = profissionalPropio?.id ?? profissionais[0]?.id ?? "";

  const [profId, setProfId] = useState<string>(defaultProfId);
  const [salaFiltro, setSalaFiltro] = useState<number | null>(salas[0]?.id ?? null);

  const dias = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const profSelecionado = profissionais.find(p => p.id === profId);

  function agsParaDia(dia: Date) {
    return agendamentos
      .filter(ag => {
        if (ag.profissional?.id !== profId) return false;
        if (salaFiltro && ag.sala?.id !== salaFiltro) return false;
        return isSameDay(new Date(ag.data_hora_inicio), dia);
      })
      .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());
  }

  // Agendamentos de OUTROS profissionais na mesma sala (para detectar "Sala Ocupada")
  function agsDeOutrosParaDia(dia: Date) {
    return agendamentos.filter(ag => {
      if (ag.profissional?.id === profId) return false;
      if (salaFiltro && ag.sala?.id !== salaFiltro) return false;
      if (!["agendado","confirmado","realizado","finalizado"].includes(ag.status)) return false;
      return isSameDay(new Date(ag.data_hora_inicio), dia);
    });
  }

  function horariosParaDia(dia: Date) {
    return horariosDisponiveis.filter(h => h.profissional_id === profId && h.dia_semana === dia.getDay());
  }

  const totalAgs = agendamentos.filter(ag => ag.profissional?.id === profId && (!salaFiltro || ag.sala?.id === salaFiltro)).length;

  const horasEspelho = Array.from({ length: TOTAL_HORAS }, (_, i) => HORA_INICIO + i);
  const PX = 56; // px por hora no espelho (ligeiramente menor para caber no modal)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand/30 shrink-0">
          <p className="text-xs text-forest-400 uppercase tracking-wider font-medium">Espelho de agendamento</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sand/30 text-forest-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-sand/20 flex gap-3 flex-wrap items-center shrink-0">
          {/* Profissional */}
          <select
            value={profId}
            onChange={e => !isProfissional && setProfId(e.target.value)}
            disabled={isProfissional}
            className={`input-field text-sm py-1.5 flex-1 min-w-52 ${isProfissional ? "opacity-70 cursor-not-allowed bg-sand/30" : ""}`}
          >
            {profissionais.length === 0 && <option value="">Nenhum profissional cadastrado</option>}
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>{p.profile?.nome_completo ?? p.id}</option>
            ))}
          </select>

          {/* Sala */}
          <select
            value={salaFiltro ?? ""}
            onChange={e => setSalaFiltro(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-sand/40 rounded-lg px-3 py-1.5 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20 shrink-0"
          >
            {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>

        {/* Grade completa: cabeçalhos sticky + horários — tudo no mesmo scroll para alinhamento perfeito */}
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-[560px]">

            {/* Coluna de horas */}
            <div className="w-10 shrink-0 relative select-none">
              {/* Espaço sticky do cabeçalho */}
              <div className="sticky top-0 z-20 h-[48px] bg-white border-b border-sand/20" />
              {/* Labels */}
              <div className="relative" style={{ height: TOTAL_HORAS * PX }}>
                {horasEspelho.map(h => (
                  <div
                    key={h}
                    className="absolute right-1.5 text-[9px] text-gray-400 leading-none"
                    style={{ top: Math.max(0, (h - HORA_INICIO) * PX - 5) }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Colunas dos dias */}
            {dias.map(dia => {
              const ags      = agsParaDia(dia);
              const horarios = horariosParaDia(dia);
              const isHoje   = isSameDay(dia, new Date());

              return (
                <div key={dia.toISOString()} className="flex-1 min-w-0 border-l border-sand/20 flex flex-col">

                  {/* Cabeçalho sticky do dia */}
                  <div className={`sticky top-0 z-20 h-[48px] flex flex-col items-center justify-center px-1 border-b border-sand/20 ${isHoje ? "bg-forest/5" : "bg-white"}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${isHoje ? "text-forest" : "text-forest-400"}`}>
                      {format(dia, "EEE", { locale: ptBR })}
                    </p>
                    <p className={`text-xs font-bold ${isHoje ? "text-forest" : "text-forest-600"}`}>
                      {format(dia, "d/MM")}
                    </p>
                  </div>

                  {/* Grid de horários */}
                  {(() => {
                    const agsOutros = agsDeOutrosParaDia(dia);
                    return (
                    <div className="relative" style={{ height: TOTAL_HORAS * PX }}>

                      {/* Linhas de hora — z-index acima das faixas de fundo */}
                      {horasEspelho.map(h => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 border-t border-gray-200"
                          style={{ top: (h - HORA_INICIO) * PX, zIndex: 1 }}
                        />
                      ))}

                      {/* Fundo por hora: cinza=indisponível, vermelho=sala ocupada, verde=disponível */}
                      {horasEspelho.map(h => {
                        const horaCoberta = horarios.some(hr => {
                          const s = parseTimeToMinutes(hr.hora_inicio);
                          const e = parseTimeToMinutes(hr.hora_fim);
                          return s <= h * 60 && e > h * 60;
                        });
                        const temAgProprio = ags.some(ag => new Date(ag.data_hora_inicio).getHours() === h);
                        // Sala Ocupada: outro prof tem agendamento nesta hora na mesma sala
                        const salaOcupada = horaCoberta && !temAgProprio && agsOutros.some(ag => new Date(ag.data_hora_inicio).getHours() === h);

                        if (temAgProprio) return null; // o card do agendamento já ocupa o espaço

                        if (!horaCoberta) {
                          return (
                            <div
                              key={h}
                              className="absolute left-0 right-0 flex items-center justify-center bg-gray-50 border-l-2 border-gray-200"
                              style={{ top: (h - HORA_INICIO) * PX, height: PX - 1, zIndex: 0 }}
                            >
                              <span className="text-[9px] text-gray-400 italic select-none">Horário Indisponível</span>
                            </div>
                          );
                        }
                        if (salaOcupada) {
                          const outroProfNome = agsOutros.find(ag => new Date(ag.data_hora_inicio).getHours() === h)?.profissional?.profile?.nome_completo ?? "";
                          return (
                            <div
                              key={h}
                              className="absolute left-0 right-0 flex flex-col items-center justify-center bg-red-50 border-l-2 border-red-400"
                              style={{ top: (h - HORA_INICIO) * PX, height: PX - 1, zIndex: 0 }}
                            >
                              <span className="text-[9px] text-red-600 font-medium select-none">Sala Ocupada</span>
                              {outroProfNome && <span className="text-[8px] text-red-400 select-none truncate px-1">{outroProfNome}</span>}
                            </div>
                          );
                        }
                        // Verde: disponível e livre
                        return (
                          <div
                            key={h}
                            className="absolute left-0 right-0 bg-green-50 border-l-2 border-green-300"
                            style={{ top: (h - HORA_INICIO) * PX, height: PX - 1, zIndex: 0 }}
                          />
                        );
                      })}

                      {/* Cards de agendamento do profissional selecionado (cor azul) */}
                      {ags.map(ag => {
                        const startDate  = new Date(ag.data_hora_inicio);
                        const endDate    = new Date(ag.data_hora_fim);
                        const startMin   = startDate.getHours() * 60 + startDate.getMinutes() - HORA_INICIO * 60;
                        const endMin     = endDate.getHours() * 60 + endDate.getMinutes()   - HORA_INICIO * 60;
                        const top        = Math.max(0, (startMin / 60) * PX);
                        const height     = Math.max(18, ((endMin - startMin) / 60) * PX - 2);
                        const isAusencia = ag.status === "ausencia";
                        const isFalta    = ag.status === "faltou" || ag.status === "cancelado";

                        return (
                          <div
                            key={ag.id}
                            className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 overflow-hidden border-l-2 border text-[10px] leading-tight ${
                              isAusencia ? "bg-gray-100 border-gray-300 border-l-gray-400 text-gray-500" :
                              isFalta    ? "bg-orange-50 border-orange-200 border-l-orange-400 text-orange-700" :
                                           "bg-blue-50 border-blue-200 border-l-blue-500 text-blue-900"
                            }`}
                            style={{ top, height, zIndex: 2 }}
                          >
                            <p className="font-semibold truncate">{format(startDate, "HH:mm")}–{format(endDate, "HH:mm")}</p>
                            {height > 28 && (
                              <p className="truncate opacity-80">{ag.paciente?.nome_completo ?? (isAusencia ? "Ausência" : "—")}</p>
                            )}
                            {height > 44 && ag.sala && (
                              <p className="truncate opacity-60 text-[9px]">{ag.sala.nome}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-sand/20 text-xs text-forest-400 shrink-0 flex flex-wrap items-center gap-4">
          <span>{totalAgs} agendamento{totalAgs !== 1 ? "s" : ""} na semana</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-50 border-l-2 border-green-300 inline-block" />
            Horário disponível
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-50 border-l-2 border-gray-300 inline-block" />
            Horário Indisponível
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-50 border-l-2 border-red-400 inline-block" />
            Sala Ocupada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-50 border-l-2 border-blue-500 inline-block" />
            Agendamento
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export function CalendarioSemanal({ agendamentos, profissionais, pacientes, aniversariantes, horariosDisponiveis, salas, weekStartStr, userRole, currentUserId, encaixes: encaixesProp = [], reagendarInfo: externalReagendarInfo, onSetReagendarInfo, onAddEncaixe, onRemoveEncaixe }: Props) {
  const router = useRouter();
  const datePickerRef = useRef<HTMLInputElement>(null);

  // ── Realtime: broadcast entre clientes ──────────────────────────────────
  const routerRef = useRef(router);
  const broadcastRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("agenda-updates", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "agenda_changed" }, () => {
        routerRef.current.refresh();
      })
      .subscribe((status: string) => {
        broadcastRef.current = status === "SUBSCRIBED" ? channel : null;
      });
    return () => {
      supabase.removeChannel(channel);
      broadcastRef.current = null;
    };
  }, []);

  /** Atualiza a própria view E notifica todos os outros clientes */
  const refreshCalendar = useCallback(() => {
    router.refresh();
    broadcastRef.current?.send({
      type: "broadcast",
      event: "agenda_changed",
      payload: {},
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Parse weekStart from string in local time (avoids UTC timezone offset bug)
  const [y, m, d] = weekStartStr.split("-").map(Number);
  const weekStart = new Date(y, m - 1, d);
  const weekEnd = addDays(weekStart, 6);

  const [viewMode, setViewMode] = useState<ViewMode>("semana");
  const [listaFiltroProf, setListaFiltroProf] = useState("todos");
  const [listaBusca, setListaBusca] = useState("");
  const [filtroProf, setFiltroProf] = useState("todos");
  const [filtroSalaId, setFiltroSalaId] = useState<number | null>(salas[0]?.id ?? null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const hoje = new Date();
    const wd = Array.from({length:6},(_,i)=>addDays(weekStart,i));
    return wd.find(d=>isSameDay(d,hoje)) ?? weekStart;
  });
  const [editingAg, setEditingAg] = useState<Agendamento|null>(null);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [expandedListId, setExpandedListId] = useState<string|null>(null);
  const [isPending, startTransition] = useTransition();
  const [showAniversariantes, setShowAniversariantes] = useState(false);
  const [showEspelho, setShowEspelho] = useState(false);
  const [legendasVisiveis, setLegendasVisiveis] = useState(false);
  const { privacyMode } = usePrivacyMode();

  // ── Modais de falta ─────────────────────────────────────────────
  const [faltaModal, setFaltaModal] = useState<{
    tipo: "cobrada" | "justificada";
    agId: string;
    paciente: Agendamento["paciente"];
    profissional: Agendamento["profissional"];
    ag?: Agendamento;
  } | null>(null);

  // ── Mapa agId → encaixeId (para desfazer falta justificada) ────
  const [encaixePorAg, setEncaixePorAg] = useState<Record<string, string>>({});

  // ── Reagendamento (sincronizado com DashboardContent via props) ──
  const [localReagendarInfo, setLocalReagendarInfo] = useState<ReagendarInfo | null>(null);
  // Usa valor externo se fornecido, senão local
  const reagendarInfo = externalReagendarInfo !== undefined ? externalReagendarInfo : localReagendarInfo;
  function setReagendarInfo(info: ReagendarInfo | null) {
    if (onSetReagendarInfo) onSetReagendarInfo(info);
    else setLocalReagendarInfo(info);
  }

  const canEdit = ["admin","supervisor","secretaria"].includes(userRole);
  // ID do profissional correspondente ao usuário logado (nulo se não for profissional ou não encontrado)
  const currentProfId = profissionais.find(p => p.profile_id === currentUserId)?.id ?? null;

  // ── Callback de clique no slot de reagendamento ──────────────────
  const handleReagendarSlotClick = useCallback((dataStr: string, horaStr: string) => {
    if (!reagendarInfo) return;
    if (reagendarInfo.duracaoMin !== undefined) {
      // Auto-agendar: cria diretamente sem formulário
      const tzOffset = new Date().getTimezoneOffset();
      startTransition(async () => {
        const { reagendarAgendamentoRapido } = await import("../agenda/actions");
        const res = await reagendarAgendamentoRapido({
          profissionalId: reagendarInfo.profissionalId,
          pacienteId: reagendarInfo.pacienteId ?? null,
          salaId: reagendarInfo.salaId ?? null,
          data: dataStr,
          hora: horaStr,
          duracaoMin: reagendarInfo.duracaoMin!,
          tipoAgendamento: reagendarInfo.tipoAgendamento ?? "consulta_avulsa",
          observacoes: reagendarInfo.observacoes ?? null,
          tzOffset,
        });
        if (!res.error) {
          if (reagendarInfo.encaixeId) {
            const { removerEncaixe } = await import("./listaEncaixeActions");
            await removerEncaixe(reagendarInfo.encaixeId);
            onRemoveEncaixe?.(reagendarInfo.encaixeId);
          }
          setReagendarInfo(null);
          refreshCalendar();
        } else {
          setMoveError(res.error);
          setTimeout(() => setMoveError(null), 4000);
        }
      });
    } else {
      // Legado (lista de encaixe): Link já navegou, só limpa o encaixe
      if (reagendarInfo.encaixeId) {
        startTransition(async () => {
          const { removerEncaixe } = await import("./listaEncaixeActions");
          await removerEncaixe(reagendarInfo.encaixeId!);
          refreshCalendar();
        });
      }
      setReagendarInfo(null);
    }
  }, [reagendarInfo, startTransition, onRemoveEncaixe]);

  // ── Drag to resize ──────────────────────────────────────────────
  const dragRef = useRef<{
    agId: string;
    startY: number;
    startDurationMin: number;
    el: HTMLDivElement;
    ag: Agendamento;
  } | null>(null);

  // ── Drag to move ─────────────────────────────────────────────────
  const moveDragRef = useRef<{
    agId: string;
    startMouseY: number;
    originalTopPx: number;
    originalDia: Date;
    durationMin: number;
    ag: Agendamento;
    el: HTMLDivElement;
    hasMoved: boolean;
    ghostEl: HTMLDivElement | null;
    currentTargetDay: Date;
    currentTargetTopPx: number;
    grabOffsetY: number; // distância do cursor ao topo do card no momento do clique
  } | null>(null);

  // Suprimir o expand após um drag (para evitar abrir o popup ao soltar)
  const suppressExpandRef = useRef<Set<string>>(new Set());

  const [moveError, setMoveError] = useState<string | null>(null);
  // Confirmação de arrastar para horário indisponível
  const [moveConfirmPending, setMoveConfirmPending] = useState<{
    agId: string; ag: Agendamento; newData: string; newHora: string; durationMin: number;
  } | null>(null);

  const handleResizeStart = useCallback((agId: string, startY: number, durationMin: number, el: HTMLDivElement) => {
    const ag = agendamentos.find(a => a.id === agId);
    if (!ag) return;
    dragRef.current = { agId, startY, startDurationMin: durationMin, el, ag };
    document.body.style.cursor = "s-resize";
    document.body.style.userSelect = "none";
  }, [agendamentos]);

  const handleMoveStart = useCallback((agId: string, startMouseY: number, originalTopPx: number, durationMin: number, el: HTMLDivElement, dia: Date) => {
    const ag = agendamentos.find(a => a.id === agId);
    if (!ag || ["realizado", "finalizado"].includes(ag.status)) return;
    // Offset entre o cursor e o topo do card — usado para posicionar pelo topo do card, não pelo cursor
    const grabOffsetY = startMouseY - el.getBoundingClientRect().top;
    moveDragRef.current = {
      agId, startMouseY, originalTopPx, originalDia: dia,
      durationMin, ag, el, hasMoved: false,
      ghostEl: null, currentTargetDay: dia, currentTargetTopPx: originalTopPx,
      grabOffsetY,
    };
    document.body.style.userSelect = "none";
  }, [agendamentos]);

  // Expand com supressão para evitar abrir popup após drag
  const handleExpand = useCallback((id: string | null) => {
    if (id && suppressExpandRef.current.has(id)) return;
    setExpandedId(id);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Drag para mover card
    if (moveDragRef.current) {
      const { startMouseY, el, durationMin, ag, grabOffsetY } = moveDragRef.current;
      const deltaY = e.clientY - startMouseY;
      if (!moveDragRef.current.hasMoved && Math.abs(deltaY) < 5) return;

      // Primeira vez que passa do limiar: criar ghost e ocultar original
      if (!moveDragRef.current.hasMoved) {
        moveDragRef.current.hasMoved = true;
        document.body.style.cursor = "grabbing";
        el.style.opacity = "0";

        // Criar elemento ghost flutuante
        const profHex = ag.profissional?.cor ? getCorById(ag.profissional.cor).hex : "#ffffff";
        const isDark = isColorDark(profHex === "#ffffff" ? "#f0f0f0" : profHex);
        const ghost = document.createElement("div");
        ghost.style.cssText = [
          "position:fixed", "z-index:9999", "pointer-events:none",
          "border-radius:8px", `border-left:4px solid ${profHex === "#ffffff" ? "#d1d5db" : profHex}`,
          `background:${profHex === "#ffffff" ? "#ffffff" : profHex}`,
          `color:${isDark ? "#ffffff" : "#1a1a1a"}`,
          "padding:4px 12px", "font-size:12px", "font-weight:600",
          "box-shadow:0 8px 24px rgba(0,0,0,0.25)", "white-space:nowrap",
          "transform:rotate(2deg)", "transition:none",
        ].join(";");
        document.body.appendChild(ghost);
        moveDragRef.current.ghostEl = ghost;
      }

      // Detectar coluna alvo pelo elemento sob o cursor
      const topEl = document.elementFromPoint(e.clientX, e.clientY);
      const colEl = topEl?.closest("[data-dia-date]") as HTMLElement | null;
      if (colEl?.dataset?.diaDate) {
        const [y, m, d] = colEl.dataset.diaDate.split("-").map(Number);
        moveDragRef.current.currentTargetDay = new Date(y, m - 1, d);

        // Snap para hora cheia dentro da coluna
        // Subtrai grabOffsetY para usar o topo do card (não o cursor) como referência de posição
        const rect = colEl.getBoundingClientRect();
        const rawTopPx = e.clientY - rect.top - grabOffsetY;
        const step = PX_POR_HORA; // snap em horas cheias (ex: 10h, 11h, 12h)
        const snappedTopPx = Math.round(rawTopPx / step) * step;
        const maxTopPx = (TOTAL_HORAS - durationMin / 60) * PX_POR_HORA;
        moveDragRef.current.currentTargetTopPx = Math.max(0, Math.min(maxTopPx, snappedTopPx));
      }

      // Atualizar ghost: posição e texto
      const { ghostEl, currentTargetDay, currentTargetTopPx } = moveDragRef.current;
      if (ghostEl) {
        const finalTopPx = currentTargetTopPx;
        const newStartMin = (finalTopPx / PX_POR_HORA) * 60;
        const newHours = Math.floor((HORA_INICIO * 60 + newStartMin) / 60);
        const timeStr = `${String(newHours).padStart(2, "0")}:00`;
        const dayStr = format(currentTargetDay, "EEE d", { locale: ptBR });
        ghostEl.textContent = `${dayStr} · ${timeStr}  ${ag.paciente?.nome_completo ?? "—"}`;
        ghostEl.style.left = `${e.clientX - ghostEl.offsetWidth / 2}px`;
        ghostEl.style.top = `${e.clientY - 36}px`;
      }
      return;
    }
    if (!dragRef.current) return;
    const { startY, startDurationMin, el, ag } = dragRef.current;
    const deltaY = e.clientY - startY;
    const rawMin = startDurationMin + deltaY;
    // Minimum duration = tempo_atendimento do profissional ou 15min
    const prof = profissionais.find(p => p.id === (ag.profissional?.id ?? ""));
    const minDur = prof?.tempo_atendimento ?? 15;
    // Maximum duration = até o próximo agendamento do mesmo profissional
    const agInicio = new Date(ag.data_hora_inicio).getTime();
    const proximoInicio = agendamentos
      .filter(a =>
        a.id !== ag.id &&
        a.profissional?.id === ag.profissional?.id &&
        new Date(a.data_hora_inicio).getTime() > agInicio
      )
      .map(a => new Date(a.data_hora_inicio).getTime())
      .sort((a, b) => a - b)[0];
    const maxDur = proximoInicio
      ? Math.floor((proximoInicio - agInicio) / 60000)
      : 24 * 60;
    const snappedMin = Math.min(maxDur, Math.max(minDur, Math.round(rawMin / 15) * 15));
    const newHeight = Math.max(22, (snappedMin / 60) * PX_POR_HORA - 2);
    el.style.height = `${newHeight}px`;
  }, [agendamentos, profissionais]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Drop de mover card
    if (moveDragRef.current) {
      const { agId, originalTopPx, durationMin, ag, el, hasMoved, ghostEl, currentTargetDay, currentTargetTopPx } = moveDragRef.current;
      moveDragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // Remover ghost do DOM
      if (ghostEl?.parentNode) ghostEl.parentNode.removeChild(ghostEl);

      // Restaurar card original
      el.style.opacity = "";
      el.style.zIndex = "";
      el.style.top = `${originalTopPx}px`;

      if (!hasMoved) return;

      // Suprimir expand após drag
      suppressExpandRef.current.add(agId);
      setTimeout(() => suppressExpandRef.current.delete(agId), 200);

      // Calcular novo horário a partir da posição pixel snappada
      const newStartMin = (currentTargetTopPx / PX_POR_HORA) * 60;
      const newHours = Math.floor((HORA_INICIO * 60 + newStartMin) / 60);
      const newHora = `${String(newHours).padStart(2, "0")}:00`;
      const newData = format(currentTargetDay, "yyyy-MM-dd");
      const tzOffset = new Date().getTimezoneOffset();

      // Nada mudou → não chamar servidor
      const oldData = format(new Date(ag.data_hora_inicio), "yyyy-MM-dd");
      const oldHora = format(new Date(ag.data_hora_inicio), "HH:mm");
      if (newData === oldData && newHora === oldHora) return;

      // Verificar se o horário destino está nos horários disponíveis do profissional
      const profId = ag.profissional?.id;
      const diaSemana = currentTargetDay.getDay();
      const horaDestino = newHours;
      const horariosProfParaDia = horariosDisponiveis.filter(
        h => h.profissional_id === profId && h.dia_semana === diaSemana
      );
      const estaDisponivel = horariosProfParaDia.some(h => {
        const s = parseTimeToMinutes(h.hora_inicio) / 60;
        const e = parseTimeToMinutes(h.hora_fim) / 60;
        return s <= horaDestino && e > horaDestino;
      });

      if (!estaDisponivel && horariosProfParaDia.length > 0) {
        // Horário fora do cadastro → pede confirmação antes de salvar
        setMoveConfirmPending({ agId, ag, newData, newHora, durationMin });
        return;
      }

      el.style.opacity = "0.5";

      startTransition(async () => {
        const res = await atualizarAgendamento(
          agId,
          ag.profissional?.id ?? "",
          ag.paciente?.id ?? "",
          ag.sala?.id ? String(ag.sala.id) : null,
          newData,
          newHora,
          durationMin,
          ag.status,
          ag.observacoes ?? null,
          tzOffset,
        );
        el.style.opacity = "";
        el.style.zIndex = "";
        if (res?.error) {
          el.style.top = `${originalTopPx}px`;
          setMoveError(res.error);
          setTimeout(() => setMoveError(null), 4000);
        } else {
          refreshCalendar(); // re-render para mover o card para a coluna correta
        }
      });
      return;
    }

    if (!dragRef.current) return;
    const { agId, startY, startDurationMin, ag } = dragRef.current;
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const deltaY = e.clientY - startY;
    const rawMin = startDurationMin + deltaY;
    const prof = profissionais.find(p => p.id === (ag.profissional?.id ?? ""));
    const minDur = prof?.tempo_atendimento ?? 15;
    const agInicio = new Date(ag.data_hora_inicio).getTime();
    const proximoInicio = agendamentos
      .filter(a =>
        a.id !== ag.id &&
        a.profissional?.id === ag.profissional?.id &&
        new Date(a.data_hora_inicio).getTime() > agInicio
      )
      .map(a => new Date(a.data_hora_inicio).getTime())
      .sort((a, b) => a - b)[0];
    const maxDur = proximoInicio
      ? Math.floor((proximoInicio - agInicio) / 60000)
      : 24 * 60;
    const snappedMin = Math.min(maxDur, Math.max(minDur, Math.round(rawMin / 15) * 15));
    if (snappedMin === startDurationMin) return;

    const tzOffset = new Date().getTimezoneOffset();
    const inicio = new Date(ag.data_hora_inicio);
    const data = format(inicio, "yyyy-MM-dd");
    const hora = format(inicio, "HH:mm");
    startTransition(async () => {
      await atualizarAgendamento(
        agId,
        ag.profissional?.id ?? "",
        ag.paciente?.id ?? "",
        ag.sala?.id ? String(ag.sala.id) : null,
        data,
        hora,
        snappedMin,
        ag.status,
        ag.observacoes ?? null,
        tzOffset,
      );
      refreshCalendar();
    });
  }, [startTransition, agendamentos, profissionais, refreshCalendar]);

  // Usa a cor cadastrada do profissional; sem cor → branco (#ffffff)
  const profColorMap = new Map(profissionais.map(p => [
    p.id,
    p.cor ? getCorById(p.cor).border : "border-l-gray-300",
  ]));
  const profBgMap = new Map(profissionais.map(p => [
    p.id,
    p.cor ? getCorById(p.cor).bg : "bg-gray-300",
  ]));
  const profHexMap = new Map(profissionais.map(p => [
    p.id,
    p.cor ? getCorById(p.cor).hex : "#ffffff",
  ]));
  const profValorConsultaMap = new Map(profissionais.map(p => [p.id, p.valor_consulta ?? null]));

  // Semana seg-sáb (sem domingo)
  const weekDays = Array.from({length:6},(_,i)=>addDays(weekStart,i))
    .filter(d => DIAS_SEMANA.includes(d.getDay()));

  const hoje = format(new Date(), "yyyy-MM-dd");
  const horas = Array.from({length:TOTAL_HORAS},(_,i)=>HORA_INICIO+i);

  // Filtrar por semana (client-side) + sala + profissional
  const agsDaSemana = agendamentos.filter(a => {
    const d = new Date(a.data_hora_inicio);
    return d >= weekStart && d <= weekEnd;
  });
  const agsFiltrados = agsDaSemana.filter(a => {
    const matchSala = filtroSalaId === null || a.sala === null || a.sala?.id === filtroSalaId;
    let matchProf: boolean;
    if (currentProfId) {
      // Usuário é profissional: vê apenas os próprios agendamentos (privacidade)
      matchProf = a.profissional?.id === currentProfId;
    } else {
      matchProf = filtroProf === "todos" || a.profissional?.id === filtroProf;
    }
    return matchSala && matchProf;
  });

  const agsParaDia  = (dia:Date) => agsFiltrados.filter(a=>isSameDay(new Date(a.data_hora_inicio),dia));
  // Agendamentos de OUTROS profissionais na mesma sala (mostrado como "Horário Indisponível")
  // Exibido sempre que o usuário logado tem um registro de profissional
  const agsOutrosParaDia = (dia: Date) => {
    if (!currentProfId) return [];
    return agsDaSemana.filter(a =>
      isSameDay(new Date(a.data_hora_inicio), dia) &&
      a.profissional?.id !== currentProfId &&
      !["cancelado","faltou","ausencia"].includes(a.status) &&
      (filtroSalaId === null || a.sala?.id === filtroSalaId)
    );
  };
  const horariosParaDia = (dia:Date) => {
    if (filtroProf==="todos") return [];
    return horariosDisponiveis.filter(h=>h.profissional_id===filtroProf && h.dia_semana===dia.getDay());
  };

  function navSemana(delta: 1|-1) {
    const nova = delta===1 ? addWeeks(weekStart,1) : subWeeks(weekStart,1);
    router.push(`/dashboard?semana=${format(nova,"yyyy-MM-dd")}`);
  }

  function irParaHoje() {
    const hojeDate = new Date();
    if (!DIAS_SEMANA.includes(hojeDate.getDay())) return;
    setSelectedDay(hojeDate);
    // mantém o modo atual (semana ou dia)
    if (!weekDays.some(d => isSameDay(d, hojeDate))) {
      router.push("/dashboard");
    }
  }

  function handleStatus(id: string, novoStatus: Status) {
    startTransition(async () => {
      await atualizarStatusAgendamento(id, novoStatus);
      if (novoStatus === "finalizado") {
        router.push("/dashboard");
        return;
      }
      const ag = agendamentos.find(a => a.id === id);
      // Desfazer (qualquer status → agendado) → remover o encaixe gerado por este ag
      if (novoStatus === "agendado") {
        // Tenta pelo mapa de sessão, depois pela lista atual (inclui dados pós-refresh)
        let encId: string | undefined = encaixePorAg[id];
        if (!encId && ag?.paciente) {
          const pacNome = ag.paciente.nome_completo.toLowerCase();
          const profId = ag.profissional?.id ?? null;
          const match = encaixesProp.find(e =>
            e.paciente_nome.toLowerCase() === pacNome &&
            e.profissional_id === profId
          );
          encId = match?.id;
        }
        if (encId) {
          const { removerEncaixe } = await import("./listaEncaixeActions");
          await removerEncaixe(encId);
          onRemoveEncaixe?.(encId);
          setEncaixePorAg(prev => { const next = { ...prev }; delete next[id]; return next; });
        }
        refreshCalendar();
      } else if (novoStatus === "faltou" || novoStatus === "cancelado") {
        if (ag) {
          setFaltaModal({
            tipo: novoStatus === "faltou" ? "cobrada" : "justificada",
            agId: id,
            paciente: ag.paciente,
            profissional: ag.profissional,
            ag,
          });
        }
        // o modal chama refreshCalendar() ao fechar
      } else {
        // confirmado, ausencia, etc.
        refreshCalendar();
      }
    });
  }

  function handlePayment(id: string, forma: string, valor: number | null, outrosDesc?: string, qtd?: number) {
    startTransition(async () => {
      await marcarPagamentoAgendamento(id, true, forma, valor, outrosDesc, qtd);
      refreshCalendar();
    });
  }

  function handleUndoPayment(id: string) {
    startTransition(async () => {
      await marcarPagamentoAgendamento(id, false, null);
      refreshCalendar();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este agendamento? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => {
      await deletarAgendamentoClient(id);
      refreshCalendar();
    });
  }

  const isCurrentWeek = weekDays.some(d=>format(d,"yyyy-MM-dd")===hoje);
  const agendadosHoje = agsDaSemana.filter(a=> {
    const matchSala = filtroSalaId === null || a.sala === null || a.sala?.id === filtroSalaId;
    return matchSala && isSameDay(new Date(a.data_hora_inicio),new Date()) && ["agendado","confirmado"].includes(a.status);
  }).length;

  const salaAtual = salas.find(s => s.id === filtroSalaId);

  // ── Aniversariantes ───────────────────────────────────────────────
  const mesAtual = new Date().getMonth(); // 0-11
  const diaAtual = new Date().getDate();
  const aniversariantesMes = aniversariantes
    .filter(a => {
      if (!a.data_nascimento) return false;
      const nasc = new Date(a.data_nascimento + "T12:00:00");
      return nasc.getMonth() === mesAtual;
    })
    .sort((a, b) => {
      const da = new Date(a.data_nascimento + "T12:00:00").getDate();
      const db = new Date(b.data_nascimento + "T12:00:00").getDate();
      return da - db;
    });
  // Contador mostra todos (pacientes e profissionais) que fazem aniversário hoje
  const aniversariantesHoje = aniversariantesMes.filter(a => {
    const nasc = new Date(a.data_nascimento + "T12:00:00");
    return nasc.getDate() === diaAtual;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-forest-500 mb-0.5">Agenda</p>
          <h1 className="font-display text-2xl text-forest">
            {viewMode==="semana"
              ? `${format(weekDays[0],"d MMM",{locale:ptBR})} – ${format(weekDays[weekDays.length-1],"d 'de' MMMM yyyy",{locale:ptBR})}`
              : format(selectedDay,"EEEE, d 'de' MMMM",{locale:ptBR})}
          </h1>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-sand/40 rounded-xl px-3 py-2">
            <CalendarDays className="w-4 h-4 text-forest-500" strokeWidth={1.5} />
            <div className="text-center"><p className="text-xs text-forest-500 leading-none">Hoje</p><p className="text-lg font-semibold text-forest leading-tight">{agendadosHoje}</p></div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-sand/40 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-forest-500" strokeWidth={1.5} />
            <div className="text-center"><p className="text-xs text-forest-500 leading-none">Semana</p><p className="text-lg font-semibold text-forest leading-tight">{agsFiltrados.length}</p></div>
          </div>
        </div>
      </div>

      {/* ── Banner de reagendamento ───────────────────────────────────── */}
      {reagendarInfo && (
        <div className="rounded-xl border border-blue-400 bg-blue-600 text-white px-4 py-3 flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Clique em um horário para reagendar</p>
              <p className="text-xs text-blue-200">{reagendarInfo.pacienteNome} · {reagendarInfo.profissionalNome}</p>
            </div>
          </div>
          <button
            onClick={() => setReagendarInfo(null)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Cancelar reagendamento"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs de sala */}
      <div className="flex gap-1 p-1 bg-sand/20 rounded-xl w-fit">
        {[...salas].sort((a, b) => {
          const aOnline = a.nome.toLowerCase().includes("online") ? 1 : 0;
          const bOnline = b.nome.toLowerCase().includes("online") ? 1 : 0;
          if (aOnline !== bOnline) return aOnline - bOnline;
          return (a.ordem ?? a.id) - (b.ordem ?? b.id);
        }).map(s => {
          const isOnline = s.nome.toLowerCase().includes("online");
          return (
            <button
              key={s.id}
              onClick={() => setFiltroSalaId(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroSalaId === s.id ? "bg-white text-forest shadow-sm" : "text-forest-500 hover:text-forest hover:bg-white/50"}`}
            >
              {isOnline ? <Monitor className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
              {s.nome}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={()=>navSemana(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={irParaHoje} className={`px-3 h-8 text-sm rounded-lg border transition-colors ${isCurrentWeek&&viewMode==="dia"&&format(selectedDay,"yyyy-MM-dd")===hoje?"bg-forest text-cream border-forest":"border-sand/40 hover:bg-sand/20 text-forest"}`}>Hoje</button>
        <button onClick={()=>navSemana(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"><ChevronRight className="w-4 h-4" /></button>
        <div className="relative">
          <button
            onClick={() => datePickerRef.current?.showPicker?.() ?? datePickerRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"
            title="Ir para data"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          <input
            ref={datePickerRef}
            type="date"
            className="absolute opacity-0 pointer-events-none w-0 h-0 top-0 left-0"
            onChange={e => {
              if (!e.target.value) return;
              const [py, pm, pd] = e.target.value.split("-").map(Number);
              const picked = new Date(py, pm - 1, pd);
              const ws = startOfWeek(picked, { weekStartsOn: 1 });
              router.push(`/dashboard?semana=${format(ws, "yyyy-MM-dd")}`);
            }}
          />
        </div>
        {/* Aniversariantes */}
        <div className="relative">
          <button
            onClick={() => setShowAniversariantes(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest transition-colors"
            title="Aniversariantes do mês"
          >
            <Cake className="w-4 h-4" />
          </button>
          {aniversariantesHoje.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rust text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
              {aniversariantesHoje.length}
            </span>
          )}
          {showAniversariantes && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAniversariantes(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-sand/30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-peach/20 border-b border-sand/20">
                  <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-rust" />
                    <span className="text-sm font-semibold text-forest">
                      Aniversariantes de {new Date().toLocaleDateString("pt-BR", { month: "long" }).replace(/^\w/, c => c.toUpperCase())}
                    </span>
                  </div>
                  <button onClick={() => setShowAniversariantes(false)} className="p-1 rounded-lg hover:bg-forest/10 text-forest-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {aniversariantesMes.length === 0 ? (
                    <p className="text-sm text-forest-400 text-center py-8">Nenhum aniversariante este mês.</p>
                  ) : (() => {
                    const pacientes = aniversariantesMes.filter(a => a.tipo !== "profissional");
                    const profissionais = aniversariantesMes.filter(a => a.tipo === "profissional");
                    const renderItem = (a: typeof aniversariantesMes[0]) => {
                      const nasc = new Date(a.data_nascimento + "T12:00:00");
                      const dia = nasc.getDate();
                      const isHoje = dia === diaAtual;
                      const rawPhone = (a.telefone ?? "").replace(/\D/g, "");
                      const waLink = rawPhone ? `https://wa.me/${rawPhone.length <= 11 ? "55" + rawPhone : rawPhone}` : null;
                      return (
                        <div key={a.id} className={`flex items-center gap-3 px-4 py-2.5 ${isHoje ? "bg-peach/10" : ""}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isHoje ? "bg-rust text-white" : "bg-sand/30 text-forest"}`}>
                            {dia}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isHoje ? "text-rust" : "text-forest"}`}>
                                {a.nome_completo}
                              </p>
                              {isHoje && <span className="shrink-0 text-[10px] bg-rust/10 text-rust px-1 py-0.5 rounded-full whitespace-nowrap">hoje 🎂</span>}
                            </div>
                            {waLink && (
                              <a href={waLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors">
                                <WhatsAppIcon className="w-3 h-3" /> {a.telefone}
                              </a>
                            )}
                          </div>
                          {a.profissional_nome && userRole !== "profissional" && (
                            <span className="flex items-center gap-1 text-xs text-forest-400 shrink-0 max-w-[110px] truncate" title={`Profissional: ${a.profissional_nome}`}>
                              <Stethoscope className="w-3 h-3 shrink-0" />
                              <span className="truncate">{a.profissional_nome}</span>
                            </span>
                          )}
                        </div>
                      );
                    };
                    return (
                      <div>
                        {pacientes.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 px-4 py-2 bg-sand/10 border-b border-sand/20">
                              <Users2Icon className="w-3.5 h-3.5 text-forest-400" />
                              <span className="text-xs font-semibold text-forest-500 uppercase tracking-wider">Pacientes</span>
                            </div>
                            <div className="divide-y divide-sand/20">{pacientes.map(renderItem)}</div>
                          </>
                        )}
                        {profissionais.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 px-4 py-2 bg-sand/10 border-b border-sand/20 border-t border-sand/20">
                              <Stethoscope className="w-3.5 h-3.5 text-forest-400" />
                              <span className="text-xs font-semibold text-forest-500 uppercase tracking-wider">Profissionais</span>
                            </div>
                            <div className="divide-y divide-sand/20">{profissionais.map(renderItem)}</div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
        {/* Espelho do dia */}
        <button
          type="button"
          onClick={() => setShowEspelho(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest transition-colors"
          title="Espelho de agendamento"
        >
          <FileText className="w-4 h-4" />
        </button>

        <div className="flex-1" />
        <div className="flex rounded-lg border border-sand/40 overflow-hidden text-sm">
          {(["dia","semana","lista"] as const).map(mode => {
            const icons = { dia: <AlignLeft className="w-3.5 h-3.5"/>, semana: <LayoutGrid className="w-3.5 h-3.5"/>, lista: <List className="w-3.5 h-3.5"/> };
            const labels = { dia: "Dia", semana: "Semana", lista: "Lista" };
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 h-8 flex items-center gap-1.5 transition-colors border-r border-sand/40 last:border-r-0 ${viewMode===mode?"bg-forest text-cream":"hover:bg-sand/20 text-forest"}`}
              >
                {icons[mode]}
                {labels[mode]}
              </button>
            );
          })}
        </div>
        <select value={filtroProf} onChange={e=>setFiltroProf(e.target.value)} className="h-8 text-sm border border-sand/40 rounded-lg px-2 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20">
          <option value="todos">Todos os profissionais</option>
          {profissionais.map(p=><option key={p.id} value={p.id}>{p.profile?.nome_completo??p.id}</option>)}
        </select>
        <Link href={`/agenda/novo${filtroSalaId ? `?sala_id=${filtroSalaId}` : ""}`} className="btn-primary h-8 flex items-center gap-1.5 text-sm px-3">
          <Plus className="w-4 h-4" /> Novo agendamento
        </Link>
      </div>

      {/* ── Lista View ─────────────────────────────────────────── */}
      {viewMode === "lista" && (() => {
        const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
        const filtradosLista = agendamentos.filter(a => {
          const matchData = new Date(a.data_hora_inicio) >= inicioDia;
          const matchSala = filtroSalaId === null || a.sala === null || a.sala?.id === filtroSalaId;
          const matchProf = listaFiltroProf === "todos" || a.profissional?.id === listaFiltroProf;
          const t = listaBusca.toLowerCase();
          const matchBusca = !t || (a.paciente?.nome_completo?.toLowerCase().includes(t) ?? false) || (a.profissional?.profile?.nome_completo?.toLowerCase().includes(t) ?? false);
          return matchData && matchSala && matchProf && matchBusca;
        });
        const grupos: Record<string, Agendamento[]> = {};
        filtradosLista.forEach(a => {
          const key = format(new Date(a.data_hora_inicio), "yyyy-MM-dd");
          if (!grupos[key]) grupos[key] = [];
          grupos[key].push(a);
        });
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
                <input type="text" placeholder="Buscar por paciente ou profissional…" value={listaBusca} onChange={e => setListaBusca(e.target.value)} className="input-field pl-9 h-9 text-sm" />
              </div>
              <select value={listaFiltroProf} onChange={e => setListaFiltroProf(e.target.value)} className="h-9 text-sm border border-sand/40 rounded-lg px-3 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20">
                <option value="todos">Todos os profissionais</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.profile?.nome_completo ?? p.id}</option>)}
              </select>
            </div>
            {Object.keys(grupos).length === 0 ? (
              <div className="card text-center py-16">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
                <p className="font-display text-xl text-forest mb-2">Nenhum agendamento</p>
                <p className="text-forest-600">{listaBusca || listaFiltroProf !== "todos" ? "Nenhum resultado com esse filtro." : "Nenhum agendamento cadastrado."}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(grupos).map(([data, itens]) => (
                  <section key={data}>
                    <h2 className="font-display text-xl text-forest mb-3">
                      {format(new Date(data + "T12:00:00"), "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
                    </h2>
                    <div className="card p-0 overflow-hidden">
                      <ul className="divide-y divide-sand/20">
                        {itens.map(a => {
                          const ativo = a.status === "agendado" || a.status === "confirmado";
                          const isExpanded = expandedListId === a.id;
                          const profHex = a.profissional?.cor ? getCorById(a.profissional.cor).hex : "#ffffff";
                          const profValorConsulta = profValorConsultaMap.get(a.profissional?.id ?? "");
                          const valorUnitarioEfetivoLista: number | null | undefined = a.tipo_agendamento === "plano_mensal"
                            ? (a.paciente?.valor_plano_especial ?? profValorConsulta ?? null)
                            : (a.paciente?.valor_consulta_especial ?? profValorConsulta ?? null);
                          return (
                            <li key={a.id} className="border-b border-sand/20 last:border-b-0">
                              {/* Linha principal */}
                              <div
                                className="flex items-center gap-4 px-6 py-3.5 hover:bg-cream/40 transition-colors cursor-pointer"
                                onClick={() => setExpandedListId(isExpanded ? null : a.id)}
                              >
                                {/* Barra colorida do profissional */}
                                <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: profHex === "#ffffff" ? "#d1d5db" : profHex }} />
                                <div className="w-14 text-center shrink-0">
                                  <p className="text-sm font-semibold text-forest">{format(new Date(a.data_hora_inicio), "HH:mm")}</p>
                                  <p className="text-xs text-forest-400">{format(new Date(a.data_hora_fim), "HH:mm")}</p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-forest truncate">{privacyMode ? "● ● ●" : (a.paciente?.nome_completo ?? "—")}</p>
                                  <p className="text-sm text-forest-600 truncate">
                                    {a.profissional?.profile?.nome_completo ?? "—"}
                                    {a.sala && <span className="text-forest-400"> · {a.sala.nome}</span>}
                                  </p>
                                </div>
                                {/* Ícones de status inline */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {a.status !== "ausencia" && a.status !== "cancelado" && (
                                    <span
                                      title={a.pago ? `Pago${a.forma_pagamento ? ` · ${FORMA_LABELS[a.forma_pagamento] ?? a.forma_pagamento}` : ""}` : "Pagamento pendente"}
                                      className="w-6 h-6 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: a.pago ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.80)" }}
                                    >
                                      <DollarSign className="w-3.5 h-3.5 text-white" />
                                    </span>
                                  )}
                                  {a.status === "confirmado" && (
                                    <span title="Presença confirmada" className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.85)" }}>
                                      <Check className="w-3.5 h-3.5 text-white" />
                                    </span>
                                  )}
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE_LISTA[a.status] ?? STATUS_BADGE_LISTA.agendado}`}>
                                  {STATUS[a.status as Status]?.label ?? a.status}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-forest-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </div>

                              {/* Painel expandido de ações */}
                              {isExpanded && (
                                <div className="px-6 pb-4 pt-2 bg-cream/40 border-t border-sand/20 space-y-3">
                                  {/* Botões de status */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {ativo && a.status === "agendado" && (
                                      <button title="Confirmar presença" onClick={() => handleStatus(a.id, "confirmado")}
                                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors">
                                        <Check className="w-3.5 h-3.5" /> Confirmar presença
                                      </button>
                                    )}
                                    {a.status === "confirmado" && (
                                      <button
                                        title="Finalizar sessão"
                                        onClick={() => handleStatus(a.id, "finalizado")}
                                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors bg-teal-50 text-teal-700 hover:bg-teal-100"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar
                                      </button>
                                    )}
                                    {ativo && (
                                      <>
                                        <button title="Falta Cobrada" onClick={() => handleStatus(a.id, "faltou")}
                                          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors">
                                          <UserX className="w-3.5 h-3.5" /> Falta Cobrada
                                        </button>
                                        <button title="Falta Justificada" onClick={() => handleStatus(a.id, "cancelado")}
                                          className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors">
                                          <XCircle className="w-3.5 h-3.5" /> Falta Justificada
                                        </button>
                                      </>
                                    )}
                                    {(a.status === "faltou" || a.status === "cancelado" || a.status === "confirmado" || a.status === "ausencia" || a.status === "finalizado" || a.status === "realizado") && (
                                      <button title="Desfazer" onClick={() => handleStatus(a.id, a.status === "realizado" ? "confirmado" : "agendado")}
                                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium transition-colors">
                                        <RotateCcw className="w-3.5 h-3.5" /> Desfazer
                                      </button>
                                    )}
                                    {canEdit && (
                                      <>
                                        <Link href={`/agenda/${a.id}/editar`} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-forest/10 text-forest hover:bg-forest/20 text-xs font-medium transition-colors">
                                          <Pencil className="w-3.5 h-3.5" /> Editar
                                        </Link>
                                        <button onClick={() => { handleDelete(a.id); setExpandedListId(null); }}
                                          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs font-medium transition-colors">
                                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Pagamento */}
                                  {a.status !== "ausencia" && (
                                    <div className="border-t border-sand/20 pt-2">
                                      {a.status === "cancelado" ? (
                                        <p className="text-xs text-gray-500 italic flex items-center gap-1.5">
                                          <DollarSign className="w-3.5 h-3.5 text-gray-400" /> Cobrança não necessária
                                        </p>
                                      ) : a.pago ? (
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 flex-1">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            Sessão paga
                                            {a.valor_sessao != null && <span className="font-bold">{Number(a.valor_sessao).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>}
                                            {a.forma_pagamento && <span className="font-normal text-gray-400">· {FORMA_LABELS[a.forma_pagamento] ?? a.forma_pagamento}</span>}
                                          </p>
                                          <button
                                            title="Desfazer pagamento"
                                            onClick={() => handleUndoPayment(a.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          {a.status === "finalizado" && (
                                            <div className="flex items-center gap-2 py-2 mb-1 bg-amber-50 rounded-lg px-3">
                                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                              <p className="text-xs text-amber-700 font-medium">Sessão finalizada sem pagamento — inadimplente</p>
                                            </div>
                                          )}
                                          <PaymentForm
                                            agId={a.id}
                                            defaultValor={a.valor_sessao ?? valorUnitarioEfetivoLista}
                                            valorUnitario={valorUnitarioEfetivoLista}
                                            onConfirm={(forma, valor, outrosDesc, qtd) => handlePayment(a.id, forma, valor, outrosDesc, qtd)}
                                          />
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Grid */}
      {viewMode !== "lista" && <div
        className="rounded-xl border border-sand/30 bg-white overflow-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {viewMode==="semana" ? (
          <div className="flex min-w-[600px]">
            <div className="w-14 shrink-0 border-r border-gray-100">
              <div className="h-10 border-b border-gray-100" />
              {horas.map(h=>(
                <div key={h} className="relative" style={{height:PX_POR_HORA}}>
                  <span className="absolute -top-2.5 left-1 text-[11px] text-gray-400">{String(h).padStart(2,"0")}:00</span>
                </div>
              ))}
            </div>
            {weekDays.map((dia,i)=>{
              const isHoje = format(dia,"yyyy-MM-dd")===hoje;
              const agsDay = agsParaDia(dia);
              const ativos = agsDay.filter(a=>["agendado","confirmado"].includes(a.status)).length;
              return (
                <div key={i} className="flex-1 min-w-0 border-r border-gray-100 last:border-r-0 flex flex-col">
                  <div className={`h-10 border-b border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${isHoje?"bg-forest/5":""}`} onClick={()=>{setSelectedDay(dia);setViewMode("dia");}}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide capitalize">{format(dia,"EEE",{locale:ptBR})}</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-semibold ${isHoje?"text-forest":"text-gray-700"}`}>{format(dia,"d")}</span>
                      {ativos>0&&<span className="text-[10px] bg-forest/10 text-forest rounded-full px-1 leading-4">{ativos}</span>}
                    </div>
                  </div>
                  <div className="relative px-0.5" data-dia-date={format(dia, "yyyy-MM-dd")}>
                    <DiaColuna dia={dia} ags={agsDay} agsOutros={agsOutrosParaDia(dia)} horariosParaDia={horariosParaDia(dia)} mostrarHorarios={filtroProf!=="todos"} profColorMap={profColorMap} profHexMap={profHexMap} profValorConsultaMap={profValorConsultaMap} onEdit={setEditingAg} onDelete={handleDelete} onStatus={handleStatus} onPayment={handlePayment} onUndoPayment={handleUndoPayment} onResizeStart={handleResizeStart} onMoveStart={handleMoveStart} pending={isPending} canEdit={canEdit} salaId={filtroSalaId} expandedId={expandedId} onExpand={handleExpand} privacyMode={privacyMode} reagendarInfo={reagendarInfo} onReagendarSlotClick={handleReagendarSlotClick} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista dia: seletor de dia (seg-sáb) + coluna única */
          <div>
            <div className="flex border-b border-gray-100 overflow-x-auto">
              <div className="w-14 shrink-0 border-r border-gray-100" />
              {weekDays.map((dia,i)=>{
                const isSel=isSameDay(dia,selectedDay), isHoje=format(dia,"yyyy-MM-dd")===hoje;
                return (
                  <button key={i} onClick={()=>setSelectedDay(dia)} className={`flex-1 min-w-[60px] py-2 flex flex-col items-center border-r border-gray-100 last:border-r-0 transition-colors ${isSel?"bg-forest/5":"hover:bg-gray-50"}`}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide capitalize">{format(dia,"EEE",{locale:ptBR})}</span>
                    <span className={`text-sm font-semibold ${isHoje?"text-forest":"text-gray-700"} ${isSel?"underline decoration-2 underline-offset-2 decoration-forest":""}`}>{format(dia,"d")}</span>
                  </button>
                );
              })}
            </div>

            {/* Grid do dia selecionado */}
            <div className="flex min-w-0">
              <div className="w-14 shrink-0 border-r border-gray-100">
                {horas.map(h=>(
                  <div key={h} className="relative" style={{height:PX_POR_HORA}}>
                    <span className="absolute -top-2.5 left-1 text-[11px] text-gray-400">{String(h).padStart(2,"0")}:00</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 px-1" data-dia-date={format(selectedDay, "yyyy-MM-dd")}>
                <DiaColuna
                  dia={selectedDay}
                  ags={agsParaDia(selectedDay)}
                  agsOutros={agsOutrosParaDia(selectedDay)}
                  horariosParaDia={horariosParaDia(selectedDay)}
                  mostrarHorarios={filtroProf!=="todos"}
                  profColorMap={profColorMap}
                  profHexMap={profHexMap}
                  profValorConsultaMap={profValorConsultaMap}
                  onEdit={setEditingAg}
                  onDelete={handleDelete}
                  onStatus={handleStatus}
                  onPayment={handlePayment}
                  onUndoPayment={handleUndoPayment}
                  onResizeStart={handleResizeStart}
                  onMoveStart={handleMoveStart}
                  pending={isPending}
                  canEdit={canEdit}
                  salaId={filtroSalaId}
                  expandedId={expandedId}
                  onExpand={handleExpand}
                  privacyMode={privacyMode}
                  reagendarInfo={reagendarInfo}
                  onReagendarSlotClick={handleReagendarSlotClick}
                />
              </div>
            </div>

            {/* Resumo do dia */}
            <div className="border-t border-gray-100 p-4">
              <p className="text-xs font-medium text-forest-500 uppercase tracking-wider mb-3">
                Resumo — {agsParaDia(selectedDay).length} atendimento(s)
                {salaAtual && <span className="ml-2 font-normal normal-case text-forest-400">· {salaAtual.nome}</span>}
              </p>
              {filtroProf!=="todos" && horariosParaDia(selectedDay).length>0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {horariosParaDia(selectedDay).map((h,i)=>(
                    <span key={i} className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Disponível: {h.hora_inicio.slice(0,5)} – {h.hora_fim.slice(0,5)}
                    </span>
                  ))}
                </div>
              )}
              {agsParaDia(selectedDay).length===0 ? (
                <p className="text-sm text-forest-400">Nenhum agendamento para este dia.</p>
              ) : (
                <div className="space-y-2">
                  {agsParaDia(selectedDay)
                    .sort((a,b)=>new Date(a.data_hora_inicio).getTime()-new Date(b.data_hora_inicio).getTime())
                    .map(ag=>{
                      const cfg=STATUS[ag.status]??STATUS.agendado;
                      const profIdx=profissionais.findIndex(p=>p.id===ag.profissional?.id);
                      return (
                        <div key={ag.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={()=>canEdit&&setEditingAg(ag)}>
                          <div className={`w-1.5 h-8 rounded-full ${profBgMap.get(ag.profissional?.id ?? "") ?? BG_PROF[0]} shrink-0`} />
                          <div className="w-16 text-center shrink-0">
                            <p className="text-sm font-semibold text-forest">{format(new Date(ag.data_hora_inicio),"HH:mm")}</p>
                            <p className="text-xs text-forest-400">{format(new Date(ag.data_hora_fim),"HH:mm")}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-forest truncate">{privacyMode ? "● ● ●" : (ag.paciente?.nome_completo??"—")}</p>
                            <p className="text-xs text-forest-500 truncate">
                              {ag.profissional?.profile?.nome_completo}{ag.sala?` · ${ag.sala.nome}`:""}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.badge}`}>{cfg.label}</span>
                          {canEdit&&<Pencil className="w-3.5 h-3.5 text-forest-400 shrink-0"/>}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>}

      {/* Legenda */}
      {viewMode !== "lista" && (
        <div className="flex items-center gap-2">
          {/* Botão toggle */}
          <button
            type="button"
            onClick={() => setLegendasVisiveis(v => !v)}
            title={legendasVisiveis ? "Ocultar legendas" : "Mostrar legendas"}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-forest-400 hover:text-forest hover:bg-sand/30 transition-colors"
          >
            {legendasVisiveis ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            )}
          </button>

          {/* Legendas com animação de reveal esquerda→direita */}
          <div
            className="overflow-hidden"
            style={{
              maxWidth: legendasVisiveis ? "1200px" : "0px",
              transition: "max-width 0.4s ease",
            }}
          >
            <div className="flex flex-nowrap items-center gap-2 pr-1">
              {LEGENDA_ORDEM.map(key => {
                const cfg = STATUS[key];
                return (
                  <span key={key} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600 whitespace-nowrap">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} /> {cfg.label}
                  </span>
                );
              })}
              {filtroProf !== "todos" && (
                <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-green-50 border-green-200 text-green-800 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" /> Horário disponível
                </span>
              )}
              {currentProfId && (
                <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-red-50 border-red-200 text-red-700 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /> Horário indisponível
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-red-50 border-red-200 text-red-700 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Inadimplente
              </span>
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-700 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" /> Aguardando pagamento
              </span>
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Pagamento efetuado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Espelho de agendamento */}
      {showEspelho && (
        <EspelhoModal
          profissionais={profissionais}
          agendamentos={agendamentos}
          horariosDisponiveis={horariosDisponiveis}
          salas={salas}
          weekStart={weekStart}
          userRole={userRole}
          currentUserId={currentUserId}
          onClose={() => setShowEspelho(false)}
        />
      )}

      {/* Modal de edição */}
      {editingAg && (
        <EditModal
          ag={editingAg}
          profissionais={profissionais}
          pacientes={pacientes}
          salas={salas}
          onClose={()=>setEditingAg(null)}
          onSaved={()=>refreshCalendar()}
        />
      )}

      {/* Modal falta cobrada */}
      {faltaModal?.tipo === "cobrada" && (
        <FaltaCobradaModal
          pacienteNome={faltaModal.paciente?.nome_completo ?? "Paciente"}
          onClose={() => { setFaltaModal(null); refreshCalendar(); }}
        />
      )}

      {/* Modal falta justificada */}
      {faltaModal?.tipo === "justificada" && (
        <FaltaJustificadaModal
          pacienteNome={faltaModal.paciente?.nome_completo ?? "Paciente"}
          onListaEncaixe={async () => {
            // Adiciona à lista de encaixe somente quando o usuário clica no botão
            const { ag: agFalta, agId: agIdFalta, paciente: pacFalta, profissional: profFalta } = faltaModal;
            if (pacFalta && profFalta && !encaixePorAg[agIdFalta]) {
              const res = await adicionarEncaixeDireto(
                pacFalta.nome_completo,
                profFalta.id ?? null,
                pacFalta.telefone ?? null,
              );
              if (res.id) {
                setEncaixePorAg(prev => ({ ...prev, [agIdFalta]: res.id! }));
                if (!res.jaExistia) {
                  onAddEncaixe?.({
                    id: res.id!,
                    paciente_nome: pacFalta.nome_completo,
                    telefone: pacFalta.telefone ?? null,
                    observacoes: null,
                    profissional_id: profFalta.id ?? null,
                    created_at: new Date().toISOString(),
                    profissional: profFalta ? { profile: profFalta.profile } : null,
                  });
                }
              }
            }
            setFaltaModal(null);
            refreshCalendar();
          }}
          onReagendar={async () => {
            if (faltaModal.paciente && faltaModal.profissional) {
              const agOrig = faltaModal.ag;
              const duracaoMin = agOrig
                ? Math.round((new Date(agOrig.data_hora_fim).getTime() - new Date(agOrig.data_hora_inicio).getTime()) / 60000)
                : undefined;
              // Adiciona à lista de encaixe ao reagendar (para poder desfazer depois)
              let encId = encaixePorAg[faltaModal.agId];
              if (!encId && faltaModal.paciente) {
                const res = await adicionarEncaixeDireto(
                  faltaModal.paciente.nome_completo,
                  faltaModal.profissional.id ?? null,
                  faltaModal.paciente.telefone ?? null,
                );
                if (res.id) {
                  encId = res.id;
                  setEncaixePorAg(prev => ({ ...prev, [faltaModal.agId]: res.id! }));
                  if (!res.jaExistia) {
                    onAddEncaixe?.({
                      id: res.id!,
                      paciente_nome: faltaModal.paciente!.nome_completo,
                      telefone: faltaModal.paciente!.telefone ?? null,
                      observacoes: null,
                      profissional_id: faltaModal.profissional!.id ?? null,
                      created_at: new Date().toISOString(),
                      profissional: faltaModal.profissional ? { profile: faltaModal.profissional.profile } : null,
                    });
                  }
                }
              }
              setReagendarInfo({
                pacienteId: faltaModal.paciente.id,
                pacienteNome: faltaModal.paciente.nome_completo,
                profissionalId: faltaModal.profissional.id,
                profissionalNome: faltaModal.profissional.profile?.nome_completo ?? "Profissional",
                encaixeId: encId,
                // Dados para reagendamento automático
                salaId: agOrig?.sala?.id ?? null,
                duracaoMin,
                tipoAgendamento: agOrig?.tipo_agendamento ?? "consulta_avulsa",
                observacoes: agOrig?.observacoes ?? null,
              });
            }
            setFaltaModal(null);
            refreshCalendar();
          }}
          onClose={() => { setFaltaModal(null); refreshCalendar(); }}
        />
      )}

      {/* Modal de confirmação: arrastar para horário indisponível */}
      {moveConfirmPending && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-display text-base text-forest">Horário Indisponível</h3>
                  <p className="text-sm text-forest-600 mt-1">
                    O profissional não cadastrou esse horário para atendimento. Deseja agendar mesmo assim?
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const { agId, ag, newData, newHora, durationMin } = moveConfirmPending;
                    setMoveConfirmPending(null);
                    const tzOffset = new Date().getTimezoneOffset();
                    startTransition(async () => {
                      const res = await atualizarAgendamento(
                        agId,
                        ag.profissional?.id ?? "",
                        ag.paciente?.id ?? "",
                        ag.sala?.id ? String(ag.sala.id) : null,
                        newData,
                        newHora,
                        durationMin,
                        ag.status,
                        ag.observacoes ?? null,
                        tzOffset,
                      );
                      if (res?.error) {
                        setMoveError(res.error);
                        setTimeout(() => setMoveError(null), 4000);
                      } else {
                        refreshCalendar();
                      }
                    });
                  }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setMoveConfirmPending(null)}
                  className="btn-secondary flex-1"
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast de erro ao mover card */}
      {moveError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {moveError}
        </div>
      )}
    </div>
  );
}
