"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, X, Loader2, User, FileText, AlertCircle, ChevronDown, Check, Clock, Trash2, Stethoscope,
} from "lucide-react";
import { cadastrarProfissionalCompleto, buscarDadosProfissionalPorProfile } from "../actions";
import { PROF_CORES } from "@/lib/profCores";
import { EspecialidadesMultiSelect } from "../EspecialidadesMultiSelect";

// ── Dropdown de cor ───────────────────────────────────────────────
function CorDropdown({ coresUsadas, value, onChange }: { coresUsadas: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const corAtual = PROF_CORES.find(c => c.id === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="cor" value={value} />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input-field flex items-center gap-3 text-left w-full"
      >
        {corAtual ? (
          <>
            <span className="w-5 h-5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: corAtual.hex }} />
            <span className="flex-1 text-forest">{corAtual.label}</span>
          </>
        ) : (
          <span className="flex-1 text-forest-400">Selecione uma cor…</span>
        )}
        <ChevronDown className={`w-4 h-4 text-forest-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-sand/40 rounded-xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 gap-0.5 p-2 max-h-64 overflow-y-auto">
            {PROF_CORES.map(c => {
              const usada = coresUsadas.includes(c.id) && c.id !== value;
              const sel = value === c.id;
              return (
                <button key={c.id} type="button" disabled={usada}
                  onClick={() => { onChange(c.id); setOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${usada ? "opacity-40 cursor-not-allowed" : "hover:bg-sand/20 cursor-pointer"} ${sel ? "bg-forest/5 font-medium" : ""}`}
                >
                  <span className="w-5 h-5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: c.hex }} />
                  <span className="flex-1 truncate text-forest">{c.label}</span>
                  {usada && <span className="text-[10px] text-forest-400">Em uso</span>}
                  {sel && <Check className="w-3.5 h-3.5 text-forest shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!value && <p className="text-xs text-forest-400 mt-1">Cada profissional deve ter uma cor única.</p>}
    </div>
  );
}

// ── Masks ──────────────────────────────────────────────────────────
function maskPhone(v: string) {
  const raw = v.replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) return "+" + raw.slice(1).replace(/\D/g, "");
  const d = raw.replace(/\D/g, "").substring(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function maskCpf(v: string) {
  v = v.replace(/\D/g, "").substring(0, 11);
  return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskCnpj(v: string) {
  v = v.replace(/\D/g, "").substring(0, 14);
  return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

// ── Input monetário ────────────────────────────────────────────────
function MoneyInput({ name, defaultValue, placeholder }: { name: string; defaultValue?: number | string | null; placeholder?: string }) {
  const toDisplay = (v: number | string | null | undefined) => {
    if (!v && v !== 0) return "";
    const num = parseFloat(String(v));
    if (isNaN(num)) return "";
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const [display, setDisplay] = useState(toDisplay(defaultValue));
  const [raw, setRaw] = useState(defaultValue ? String(defaultValue) : "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) { setDisplay(""); setRaw(""); return; }
    const num = parseInt(digits, 10) / 100;
    setRaw(num.toFixed(2));
    setDisplay(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  return (
    <>
      <input type="hidden" name={name} value={raw} />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-forest-400 font-medium">R$</span>
        <input type="text" inputMode="numeric" className="input-field pl-9" placeholder={placeholder ?? "0,00"} value={display} onChange={handleChange} />
      </div>
    </>
  );
}

// ── Section ────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 bg-forest/5 border-b border-sand/30">
        <Icon className="w-4 h-4 text-forest" />
        <h2 className="font-display text-base text-forest">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────
interface Props {
  profiles: { id: string; nome_completo: string }[];
  initialEspecialidades: { id: number; nome: string }[];
  coresUsadas: string[];
}

export function NovoProfissionalForm({ profiles, initialEspecialidades, coresUsadas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [tel1, setTel1] = useState("");
  const [tel2, setTel2] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState("");
  const [registroProfissional, setRegistroProfissional] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [corSelecionada, setCorSelecionada] = useState("");
  const [especialidades, setEspecialidades] = useState(initialEspecialidades);
  const [especialidadesSelecionadas, setEspecialidadesSelecionadas] = useState<number[]>([]);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  // Horários
  const [tempoAtendimento, setTempoAtendimento] = useState(60);
  const [horarios, setHorarios] = useState<{ dia_semana: number; hora_inicio: string; hora_fim: string }[]>([]);
  const [novoHoraDia, setNovoHoraDia] = useState(1);
  const [novoHoraInicio, setNovoHoraInicio] = useState("07:00");
  const [novoHoraFim, setNovoHoraFim] = useState("21:00");

  async function handleProfileChange(profileId: string) {
    if (!profileId) { setEmail(""); return; }
    setLoadingPerfil(true);
    try {
      const res = await buscarDadosProfissionalPorProfile(profileId);
      if (res.data) {
        const d = res.data;
        setEmail(d.email ?? "");
        if (d.nome_completo) setNomeCompleto(d.nome_completo);
        if (d.cpf) setCpf(maskCpf(d.cpf));
        if (d.cnpj) setCnpj(maskCnpj(d.cnpj));
        if (d.telefone_1) setTel1(maskPhone(d.telefone_1));
        if (d.telefone_2) setTel2(maskPhone(d.telefone_2));
        if (d.data_nascimento) setDataNascimento(d.data_nascimento);
        if (d.sexo) setSexo(d.sexo);
        if (d.registro_profissional) setRegistroProfissional(d.registro_profissional);
        if (d.observacoes) setObservacoes(d.observacoes);
        if (d.foto_url) setFoto(d.foto_url);
        if (d.cor) setCorSelecionada(d.cor);
        if (d.especialidade_ids?.length) setEspecialidadesSelecionadas(d.especialidade_ids);
      }
    } finally {
      setLoadingPerfil(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400, r = Math.min(MAX / img.width, MAX / img.height);
        const c = document.createElement("canvas");
        c.width = img.width * r; c.height = img.height * r;
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        setFoto(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("foto_url", foto ?? "");
    fd.set("tempo_atendimento", String(tempoAtendimento));
    fd.set("horarios_json", JSON.stringify(horarios));
    setErro(null);
    startTransition(async () => {
      const res = await cadastrarProfissionalCompleto(fd);
      if (res?.error) setErro(res.error);
      else router.push("/profissionais");
    });
  }

  function adicionarHorario() {
    if (!novoHoraInicio || !novoHoraFim) return;
    setHorarios(prev => [...prev, { dia_semana: novoHoraDia, hora_inicio: novoHoraInicio, hora_fim: novoHoraFim }]);
  }

  function removerHorario(idx: number) {
    setHorarios(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      {erro && (
        <div className="flex items-start gap-2 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Selecionar usuário ── */}
        <Section icon={User} title="Usuário">
          <div>
            <label className="label">Usuário <span className="text-rust">*</span></label>
            {profiles.length === 0 ? (
              <div className="p-4 bg-peach/10 border border-peach/30 rounded-xl text-sm text-rust">
                Todos os usuários já estão vinculados a um profissional. Peça para o novo profissional criar uma conta em{" "}
                <code className="bg-white px-1.5 py-0.5 rounded">/cadastro</code>.
              </div>
            ) : (
              <div className="relative">
                <select
                  name="profile_id"
                  required
                  className="input-field"
                  defaultValue=""
                  onChange={e => handleProfileChange(e.target.value)}
                >
                  <option value="" disabled>Selecione um usuário</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.nome_completo}</option>
                  ))}
                </select>
                {loadingPerfil && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-forest-400" />
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* ── Dados Gerais ── */}
        <Section icon={FileText} title="Dados Gerais">
          {/* Foto */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {foto ? (
                <div className="relative">
                  <img src={foto} alt="Foto" className="w-24 h-24 rounded-full object-cover border-2 border-sand/40" />
                  <button type="button" onClick={() => setFoto(null)} className="absolute -top-1 -right-1 w-5 h-5 bg-rust text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-sand/30 border-2 border-dashed border-sand/50 flex items-center justify-center">
                  <User className="w-8 h-8 text-forest-300" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-forest-500">Foto do profissional <span className="text-forest-400">(opcional)</span></p>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs border border-sand/40 px-3 py-1.5 rounded-lg hover:bg-sand/20 text-forest transition-colors">
                <Upload className="w-3.5 h-3.5" /> Selecionar foto
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <p className="text-xs text-forest-400">Data de cadastro: {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome completo</label>
              <input name="nome_completo" type="text" className="input-field" placeholder="Nome completo do profissional"
                value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input-field opacity-60 cursor-not-allowed"
                value={email}
                placeholder="Selecione um usuário acima"
                disabled
                readOnly
              />
              <p className="text-xs text-forest-400 mt-1">O e-mail não pode ser alterado.</p>
            </div>
            <div>
              <label className="label">Data de nascimento <span className="text-rust">*</span></label>
              <input name="data_nascimento" type="date" className="input-field" required
                value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
            </div>
            <div>
              <label className="label">Sexo <span className="text-rust">*</span></label>
              <select name="sexo" className="input-field" required
                value={sexo} onChange={e => setSexo(e.target.value)}>
                <option value="" disabled>Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="label">CPF <span className="text-rust">*</span></label>
              <input name="cpf" type="text" className="input-field" required placeholder="000.000.000-00"
                value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} />
            </div>
            <div>
              <label className="label">CNPJ</label>
              <input name="cnpj" type="text" className="input-field" placeholder="00.000.000/0000-00"
                value={cnpj} onChange={e => setCnpj(maskCnpj(e.target.value))} />
            </div>
          </div>

          {/* Telefones */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Telefone 1</label>
              <input name="telefone_1" type="text" className="input-field" placeholder="(00) 00000-0000"
                value={tel1} onChange={e => setTel1(maskPhone(e.target.value))} />
              <p className="text-xs text-forest-400 mt-1">Para número internacional, comece com +</p>
            </div>
            <div>
              <label className="label">Telefone 2</label>
              <input name="telefone_2" type="text" className="input-field" placeholder="(00) 00000-0000"
                value={tel2} onChange={e => setTel2(maskPhone(e.target.value))} />
              <p className="text-xs text-forest-400 mt-1">Para número internacional, comece com +</p>
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea name="observacoes" rows={3} className="input-field resize-none" placeholder="Informações relevantes…"
              value={observacoes} onChange={e => setObservacoes(e.target.value)} />
          </div>
        </Section>

        {/* ── Dados Profissionais ── */}
        <Section icon={Stethoscope} title="Dados Profissionais">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Especialidades</label>
              <EspecialidadesMultiSelect
                especialidades={especialidades}
                selecionadas={especialidadesSelecionadas}
                onChange={setEspecialidadesSelecionadas}
                onEspecialidadeAdded={esp => setEspecialidades(prev => [...prev, esp])}
              />
            </div>
            <div>
              <label className="label">Cor no calendário <span className="text-rust">*</span></label>
              <CorDropdown coresUsadas={coresUsadas} value={corSelecionada} onChange={setCorSelecionada} />
            </div>
            <div>
              <label className="label">Registro profissional</label>
              <input name="registro_profissional" type="text" className="input-field" placeholder="Ex: CRP 08/12345"
                value={registroProfissional} onChange={e => setRegistroProfissional(e.target.value)} />
            </div>
            <div>
              <label className="label">Valor Consulta Avulsa</label>
              <MoneyInput name="valor_consulta" />
            </div>
            <div>
              <label className="label">Valor Plano</label>
              <MoneyInput name="valor_plano" />
            </div>
          </div>
        </Section>

        {/* ── Horários de atendimento ── */}
        <Section icon={Clock} title="Horários de atendimento">
          <p className="text-sm text-forest-600">
            Define quando este profissional está disponível para receber agendamentos.
          </p>

          {/* Duração padrão */}
          <div className="p-4 bg-cream rounded-xl border border-sand/30">
            <label className="label">Duração padrão da sessão (minutos)</label>
            <input
              type="number"
              min="5"
              step="5"
              className="input-field w-48"
              placeholder="60"
              value={tempoAtendimento}
              onChange={e => setTempoAtendimento(Number(e.target.value))}
            />
            <p className="text-xs text-forest-400 mt-1.5">Usado como padrão ao criar novos agendamentos.</p>
          </div>

          {/* Lista de horários adicionados */}
          {horarios.length === 0 ? (
            <p className="text-sm text-forest-400">Nenhum horário adicionado ainda.</p>
          ) : (
            <div className="space-y-2">
              {horarios.map((h, idx) => {
                const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                const DIAS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-cream rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-forest w-32 shrink-0">{DIAS_FULL[h.dia_semana]}</span>
                      <span className="text-sm text-forest-500">{h.hora_inicio} – {h.hora_fim}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerHorario(idx)}
                      className="p-1.5 rounded-lg text-rust hover:bg-rust/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formulário para adicionar horário */}
          <div className="border-t border-sand/30 pt-4 space-y-3">
            <p className="text-sm font-medium text-forest">Adicionar horário</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Dia da semana</label>
                <select
                  className="input-field"
                  value={novoHoraDia}
                  onChange={e => setNovoHoraDia(Number(e.target.value))}
                >
                  <option value={1}>Segunda-feira</option>
                  <option value={2}>Terça-feira</option>
                  <option value={3}>Quarta-feira</option>
                  <option value={4}>Quinta-feira</option>
                  <option value={5}>Sexta-feira</option>
                  <option value={6}>Sábado</option>
                  <option value={0}>Domingo</option>
                </select>
              </div>
              <div>
                <label className="label">Início</label>
                <input
                  type="time"
                  className="input-field"
                  value={novoHoraInicio}
                  onChange={e => setNovoHoraInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Fim</label>
                <input
                  type="time"
                  className="input-field"
                  value={novoHoraFim}
                  onChange={e => setNovoHoraFim(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={adicionarHorario}
                className="btn-primary text-sm px-8"
              >
                Adicionar horário
              </button>
            </div>
          </div>
        </Section>

        {/* Botão */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || profiles.length === 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando…</> : "Cadastrar profissional"}
          </button>
        </div>
      </form>
    </div>
  );
}
