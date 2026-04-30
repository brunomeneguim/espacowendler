"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RepeatIcon, Loader2, UserPlus, AlertTriangle, Search, X } from "lucide-react";
import { criarAgendamento, verificarHorarioIndisponivel } from "../actions";
import { removerEncaixe } from "../../dashboard/listaEncaixeActions";

interface Prof  { id: string; nome: string; especialidade?: string }
interface Pac   { id: string; nome_completo: string; telefone?: string }
interface Sala  { id: number; nome: string }

interface Props {
  profs: Prof[];
  pacs: Pac[];
  salas: Sala[];
  defaultData: string;
  defaultHora: string;
  defaultSalaId: string;
  defaultPacienteId?: string;
  defaultPacienteNome?: string;
  defaultProfissionalId?: string;
  encaixeId?: string;
  error?: string;
}

// ── Componente de busca com autocomplete ───────────────────────────
interface SearchItem { id: string; label: string; sub?: string }

function SearchableSelect({
  name,
  items,
  placeholder,
  defaultId,
  defaultLabel,
  readOnly,
}: {
  name: string;
  items: SearchItem[];
  placeholder: string;
  defaultId?: string;
  defaultLabel?: string;
  readOnly?: boolean;
}) {
  const defaultItem = items.find(i => i.id === defaultId);
  const [selectedId, setSelectedId]       = useState(defaultId ?? "");
  const [selectedLabel, setSelectedLabel] = useState(defaultItem?.label ?? "");
  const [query, setQuery]                 = useState(!defaultId && defaultLabel ? defaultLabel : "");
  const [open, setOpen]                   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? items.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        (i.sub && i.sub.toLowerCase().includes(query.toLowerCase()))
      )
    : items;

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (!selectedId) setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedId]);

  function clear() {
    setSelectedId("");
    setSelectedLabel("");
    setQuery("");
    setOpen(false);
  }

  // Modo somente-leitura (campos pré-preenchidos do reagendar)
  if (readOnly) {
    const displayLabel = selectedLabel || defaultLabel || "";
    return (
      <div className="input-field flex items-center gap-2 cursor-not-allowed bg-sand/20">
        <input type="hidden" name={name} value={selectedId} />
        <span className="flex-1 text-sm text-forest truncate">{displayLabel}</span>
        <span className="text-xs text-forest-400 shrink-0">Preenchido automaticamente</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Valor real enviado ao form */}
      <input type="hidden" name={name} value={selectedId} />

      {selectedId ? (
        /* Item selecionado — exibe nome + botão limpar */
        <div className="input-field flex items-center gap-2 cursor-default">
          <span className="flex-1 text-sm text-forest truncate">{selectedLabel}</span>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-forest-400 hover:text-rust transition-colors"
            title="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Campo de busca */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400 pointer-events-none" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder={placeholder}
            value={query}
            autoComplete="off"
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}

      {/* Dropdown de resultados */}
      {open && !selectedId && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-sand/40 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-forest-400 text-center">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </p>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-sand/20 transition-colors border-b border-sand/10 last:border-b-0"
                onMouseDown={e => {
                  e.preventDefault(); // evita blur antes do click
                  setSelectedId(item.id);
                  setSelectedLabel(item.label);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <p className="text-sm font-medium text-forest">{item.label}</p>
                {item.sub && <p className="text-xs text-forest-400 mt-0.5">{item.sub}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Formulário principal ───────────────────────────────────────────
export function NovoAgendamentoForm({ profs, pacs, salas, defaultData, defaultHora, defaultSalaId, defaultPacienteId, defaultPacienteNome, defaultProfissionalId, encaixeId, error }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tipoAg, setTipoAg] = useState<"consulta_avulsa" | "plano_mensal" | "ausencia">("consulta_avulsa");
  const [repetir, setRepetir] = useState(false);
  const [recorrencia, setRecorrencia] = useState<"semanal" | "quinzenal" | "mensal">("semanal");
  const [mensal_tipo, setMensalTipo] = useState<"dia_semana" | "dia_mes">("dia_semana");
  const [meses, setMeses] = useState("3");
  const [submitError, setSubmitError] = useState(error ?? "");
  const [ignoradasAviso, setIgnoradasAviso] = useState(0);
  const [datasIgnoradas, setDatasIgnoradas] = useState<string[]>([]);
  const [tzOffset, setTzOffset] = useState(0);
  const [avisoPendente, setAvisoPendente] = useState(false);
  const fdRef = useRef<FormData | null>(null);
  useEffect(() => { setTzOffset(new Date().getTimezoneOffset()); }, []);

  // Dados formatados para o SearchableSelect
  const profsItems: SearchItem[] = profs.map(p => ({
    id: p.id,
    label: p.nome,
    sub: p.especialidade,
  }));
  const pacsItems: SearchItem[] = pacs.map(p => ({
    id: p.id,
    label: p.nome_completo,
    sub: p.telefone,
  }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo_agendamento", tipoAg);
    if (!repetir || tipoAg === "ausencia") fd.set("recorrencia", "nenhuma");
    if (recorrencia === "mensal") fd.set("mensal_tipo", mensal_tipo);
    setSubmitError("");

    // Validação manual (hidden inputs não disparam o required nativo)
    if (!fd.get("profissional_id")) {
      setSubmitError("Selecione um profissional.");
      return;
    }
    if (tipoAg !== "ausencia" && !fd.get("paciente_id")) {
      setSubmitError("Selecione um paciente.");
      return;
    }

    // Verificar horário indisponível
    if (tipoAg !== "ausencia") {
      const profissionalId = fd.get("profissional_id") as string;
      const data = fd.get("data") as string;
      const hora = fd.get("hora") as string;
      const { conflito } = await verificarHorarioIndisponivel(profissionalId, data, hora);
      if (conflito) {
        fdRef.current = fd;
        setAvisoPendente(true);
        return;
      }
    }

    startTransition(async () => {
      const res = await criarAgendamento(fd);
      if (res.error) { setSubmitError(res.error); return; }
      if (res.ignoradas > 0) { setIgnoradasAviso(res.ignoradas); setDatasIgnoradas(res.datasIgnoradas); return; }
      if (encaixeId) await removerEncaixe(encaixeId);
      router.push("/dashboard");
    });
  }

  function confirmarAgendamento() {
    const fd = fdRef.current;
    if (!fd) return;
    fdRef.current = null;
    setAvisoPendente(false);
    startTransition(async () => {
      const res = await criarAgendamento(fd);
      if (res.error) { setSubmitError(res.error); return; }
      if (res.ignoradas > 0) { setIgnoradasAviso(res.ignoradas); setDatasIgnoradas(res.datasIgnoradas); return; }
      if (encaixeId) await removerEncaixe(encaixeId);
      router.push("/dashboard");
    });
  }

  return (
    <>
    {/* Modal de aviso — recorrências ignoradas por conflito */}
    {ignoradasAviso > 0 && (
      <>
        <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-display text-base text-forest">Sessões com conflito</h3>
                <p className="text-sm text-forest-600 mt-1">
                  O agendamento foi criado, mas <strong>{ignoradasAviso}</strong> sessão{ignoradasAviso !== 1 ? "ões" : ""} recorrente{ignoradasAviso !== 1 ? "s" : ""} {ignoradasAviso !== 1 ? "foram ignoradas" : "foi ignorada"} por conflito de horário:
                </p>
                {datasIgnoradas.length > 0 && (
                  <ul className="mt-2 max-h-36 overflow-y-auto space-y-1 text-sm">
                    {datasIgnoradas.map((iso, i) => {
                      const d = new Date(iso);
                      return (
                        <li key={i} className="flex items-center gap-2 text-forest-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                          {" às "}
                          {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            <button type="button" onClick={() => { setIgnoradasAviso(0); setDatasIgnoradas([]); router.push("/dashboard"); }}
              className="btn-primary w-full">
              Entendido
            </button>
          </div>
        </div>
      </>
    )}

    {/* Modal de aviso — horário indisponível */}
    {avisoPendente && (
      <>
        <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
              <button type="button" onClick={confirmarAgendamento} disabled={isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Sim, agendar
              </button>
              <button type="button" onClick={() => { setAvisoPendente(false); fdRef.current = null; }}
                className="btn-secondary flex-1">
                Não, cancelar
              </button>
            </div>
          </div>
        </div>
      </>
    )}

    <form onSubmit={handleSubmit} className="card space-y-5">
      <input type="hidden" name="tz_offset" value={tzOffset} />
      {submitError && (
        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(submitError)}
        </div>
      )}

      {/* Tipo de Agendamento */}
      <div>
        <label className="label">Tipo de Agendamento</label>
        <select value={tipoAg} onChange={e => setTipoAg(e.target.value as typeof tipoAg)} className="input-field">
          <option value="consulta_avulsa">Consulta Avulsa</option>
          <option value="plano_mensal">Plano Mensal</option>
          <option value="ausencia">Ausência</option>
        </select>
      </div>

      {/* Profissional */}
      <div>
        <label className="label">Profissional <span className="text-rust">*</span></label>
        {profs.length === 0 ? (
          <p className="text-xs text-rust mt-1">Nenhum profissional ativo encontrado.</p>
        ) : (
          <SearchableSelect
            name="profissional_id"
            items={profsItems}
            placeholder="Digite o nome do profissional…"
            defaultId={defaultProfissionalId}
            readOnly={!!encaixeId}
          />
        )}
      </div>

      {/* Paciente */}
      {tipoAg !== "ausencia" && (
        <div>
          <label className="label">Paciente <span className="text-rust">*</span></label>
          {pacs.length === 0 ? (
            <div className="p-4 bg-peach/10 border border-peach/30 rounded-xl text-sm text-rust">
              Nenhum paciente cadastrado.{" "}
              <Link href="/pacientes/novo?from=agenda" className="font-medium underline">Cadastrar paciente</Link>
            </div>
          ) : (
            <div className="flex items-stretch gap-2">
              <div className="flex-1">
                <SearchableSelect
                  name="paciente_id"
                  items={pacsItems}
                  placeholder="Digite o nome do paciente…"
                  defaultId={defaultPacienteId}
                  defaultLabel={defaultPacienteNome}
                  readOnly={!!encaixeId}
                />
              </div>
              {!encaixeId && (
                <Link
                  href="/pacientes/novo?from=agenda"
                  className="shrink-0 flex items-center justify-center w-10 rounded-lg border border-sand/40 hover:bg-forest/5 text-forest-500 hover:text-forest transition-colors"
                  title="Cadastrar novo paciente"
                >
                  <UserPlus className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sala */}
      <div>
        <label htmlFor="sala_id" className="label">Sala de atendimento <span className="text-rust">*</span></label>
        <select id="sala_id" name="sala_id" required className="input-field" defaultValue={defaultSalaId}>
          <option value="" disabled>Selecione a sala</option>
          {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {/* Data / Hora / Duração */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="data" className="label">Data <span className="text-rust">*</span></label>
          <input id="data" name="data" type="date" required className="input-field" defaultValue={defaultData} />
        </div>
        <div>
          <label htmlFor="hora" className="label">Horário <span className="text-rust">*</span></label>
          <input id="hora" name="hora" type="time" required className="input-field" defaultValue={defaultHora} />
        </div>
        <div>
          <label htmlFor="duracao" className="label">Duração (min)</label>
          <input id="duracao" name="duracao" type="number" min="15" step="5" defaultValue="60" className="input-field" />
        </div>
      </div>

      {/* Repetição */}
      {tipoAg === "ausencia" && (
        <div className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500">
          Ausência registrada — sem paciente nem recorrência.
        </div>
      )}
      {tipoAg !== "ausencia" && (
        <div className="rounded-xl border border-sand/40">
          <button
            type="button"
            onClick={() => setRepetir(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${repetir ? "bg-forest/5 rounded-b-none" : "hover:bg-sand/10"}`}
          >
            <div className="flex items-center gap-2">
              <RepeatIcon className={`w-4 h-4 ${repetir ? "text-forest" : "text-forest-400"}`} />
              <span className={`text-sm font-medium ${repetir ? "text-forest" : "text-forest-500"}`}>
                Repetir Agendamento
              </span>
              {repetir && <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full">Ativo</span>}
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${repetir ? "bg-forest" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${repetir ? "translate-x-5" : "translate-x-0"}`} />
            </div>
          </button>

          {repetir && (
            <div className="px-4 pb-4 pt-3 border-t border-sand/30 grid sm:grid-cols-2 gap-4 bg-forest/[0.02] rounded-b-xl">
              <input type="hidden" name="recorrencia" value={recorrencia} />
              <input type="hidden" name="meses_recorrencia" value={meses} />
              <input type="hidden" name="mensal_tipo" value={mensal_tipo} />
              <div>
                <label className="label">Frequência</label>
                <div className="flex rounded-xl border border-sand/40 overflow-hidden text-sm">
                  {([
                    ["semanal", "Semanal"],
                    ["quinzenal", "Quinzenal"],
                    ["mensal", "Mensal"],
                  ] as const).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRecorrencia(v)}
                      className={`flex-1 py-2 text-sm transition-colors border-r border-sand/40 last:border-r-0 ${recorrencia === v ? "bg-forest text-cream font-medium" : "hover:bg-sand/20 text-forest-600"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {recorrencia === "mensal" && (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-medium text-forest-500 uppercase tracking-wider">Critério mensal</label>
                    <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setMensalTipo("dia_semana")}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${mensal_tipo === "dia_semana" ? "border-forest" : "border-sand/60"}`}>
                        {mensal_tipo === "dia_semana" && <div className="w-2 h-2 rounded-full bg-forest" />}
                      </div>
                      <span className="text-sm text-forest-700">Considerar dia da semana</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setMensalTipo("dia_mes")}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${mensal_tipo === "dia_mes" ? "border-forest" : "border-sand/60"}`}>
                        {mensal_tipo === "dia_mes" && <div className="w-2 h-2 rounded-full bg-forest" />}
                      </div>
                      <span className="text-sm text-forest-700">Considerar dia do mês</span>
                    </label>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Repetir por</label>
                <select value={meses} onChange={e => setMeses(e.target.value)} className="input-field">
                  <option value="1">1 mês</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                </select>
                <p className="text-xs text-forest-400 mt-1.5">
                  {recorrencia === "semanal"   && `${parseInt(meses) * 4} sessões no total`}
                  {recorrencia === "quinzenal" && `${parseInt(meses) * 2} sessões no total`}
                  {recorrencia === "mensal"    && `${meses} sessões no total`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Observações */}
      <div>
        <label htmlFor="observacoes" className="label">Observações</label>
        <textarea id="observacoes" name="observacoes" rows={3} className="input-field resize-none"
          placeholder="Algo importante sobre este atendimento?" />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || (tipoAg !== "ausencia" && pacs.length === 0)}
          className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Agendando…" : tipoAg === "ausencia" ? "Registrar ausência" : repetir ? "Agendar sessões" : "Agendar sessão"}
        </button>
        <Link href="/dashboard" className="btn-secondary flex-1">Cancelar</Link>
      </div>
    </form>
    </>
  );
}
