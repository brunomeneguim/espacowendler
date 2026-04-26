"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, X, Loader2, User, FileText, AlertCircle, ChevronDown, Check,
} from "lucide-react";
import { cadastrarProfissionalCompleto, buscarDadosProfissionalPorProfile } from "../actions";
import { PROF_CORES } from "@/lib/profCores";
import { AddEspecialidadeButton } from "../AddEspecialidadeButton";

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
  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return "+" + digits;
  }
  const digits = raw.replace(/\D/g, "").substring(0, 11);
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
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
  const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState("");
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  async function handleProfileChange(profileId: string) {
    if (!profileId) return;
    setLoadingPerfil(true);
    try {
      const res = await buscarDadosProfissionalPorProfile(profileId);
      if (res.data) {
        const d = res.data;
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
        if (d.especialidade_id) setEspecialidadeSelecionada(String(d.especialidade_id));
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
    setErro(null);
    startTransition(async () => {
      const res = await cadastrarProfissionalCompleto(fd);
      if (res?.error) setErro(res.error);
      else router.push("/profissionais");
    });
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
            <div>
              <label className="label">Especialidade</label>
              <div className="flex items-center gap-2">
                <select
                  name="especialidade_id"
                  className="input-field flex-1"
                  value={especialidadeSelecionada}
                  onChange={e => setEspecialidadeSelecionada(e.target.value)}
                >
                  <option value="">— Sem especialidade —</option>
                  {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
                <AddEspecialidadeButton
                  onAdded={esp => {
                    setEspecialidades(prev => [...prev, esp]);
                    setEspecialidadeSelecionada(String(esp.id));
                  }}
                />
              </div>
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
