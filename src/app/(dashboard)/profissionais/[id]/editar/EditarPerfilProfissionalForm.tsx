"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  Upload, X, Loader2, User, ChevronDown, Check, Eye, EyeOff, KeyRound, Stethoscope,
} from "lucide-react";
import { editarProfissionalCompleto } from "./actions";
import { PROF_CORES } from "@/lib/profCores";
import { AddEspecialidadeButton } from "../../AddEspecialidadeButton";

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
    </div>
  );
}

// ── Máscara telefone ────────────────────────────────────────────
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

// ── Input de valor monetário ──────────────────────────────────────
function MoneyInput({ name, defaultValue, placeholder }: { name: string; defaultValue?: number | null; placeholder?: string }) {
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
        <input
          type="text"
          inputMode="numeric"
          className="input-field pl-9"
          placeholder={placeholder ?? "0,00"}
          value={display}
          onChange={handleChange}
        />
      </div>
    </>
  );
}

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

interface Especialidade { id: number; nome: string }
interface Props {
  profissionalId: string;
  profileId: string;
  profile: { nome_completo: string; email: string };
  prof: {
    foto_url?: string | null; data_nascimento?: string | null; sexo?: string | null;
    cpf?: string | null; cnpj?: string | null; uf_conselho?: string | null;
    cbos_codigo?: string | null; tempo_atendimento?: number | null; observacoes?: string | null;
    registro_profissional?: string | null; especialidade_id?: number | null;
    cor?: string | null; telefone_1?: string | null; telefone_2?: string | null;
    valor_consulta?: number | null; valor_plano?: number | null;
    ativo?: boolean;
  };
  especialidades: Especialidade[];
  coresUsadas: string[];
  searchError?: string;
  canChangePassword?: boolean;
}

export function EditarPerfilProfissionalForm({ profissionalId, profileId, profile, prof, especialidades, coresUsadas, searchError, canChangePassword }: Props) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(searchError ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState<string | null>(prof.foto_url ?? null);
  const [cpf, setCpf] = useState(prof.cpf ?? "");
  const [cnpj, setCnpj] = useState(prof.cnpj ?? "");
  const [corSelecionada, setCorSelecionada] = useState(prof.cor ?? "");
  const [tel1, setTel1] = useState(prof.telefone_1 ?? "");
  const [tel2, setTel2] = useState(prof.telefone_2 ?? "");
  const [especialidadesList, setEspecialidadesList] = useState(especialidades);
  const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState(String(prof.especialidade_id ?? ""));

  // Senha
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const senhasDivertem = novaSenha.length > 0 && confirmarSenha.length > 0 && novaSenha !== confirmarSenha;

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
    if (novaSenha && novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (novaSenha && novaSenha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("foto_url", foto ?? "");
    if (novaSenha) fd.set("nova_senha", novaSenha);
    setErro(null);
    startTransition(async () => {
      const res = await editarProfissionalCompleto(profissionalId, profileId, fd);
      if (res?.error) setErro(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {erro && (
        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">{erro}</div>
      )}

      <form id="prof-edit-form" onSubmit={handleSubmit} className="space-y-5">
        {/* ── Usuário ── */}
        <Section icon={User} title="Usuário">
          <div>
            <label className="label">Usuário vinculado</label>
            <input
              type="text"
              className="input-field opacity-60 cursor-not-allowed"
              value={profile.nome_completo}
              disabled
              readOnly
            />
            <p className="text-xs text-forest-400 mt-1">O usuário vinculado não pode ser alterado aqui.</p>
          </div>
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input-field opacity-60 cursor-not-allowed"
              value={profile.email}
              disabled
              readOnly
            />
          </div>

          {canChangePassword && (
            <div className="pt-2 border-t border-sand/20 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-forest-400" />
                <p className="text-sm font-medium text-forest">Redefinir senha</p>
              </div>
              <p className="text-xs text-forest-500">Deixe em branco para manter a senha atual.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showSenha ? "text" : "password"}
                      className="input-field pr-10"
                      placeholder="Mínimo 6 caracteres"
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400 hover:text-forest"
                    >
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmar ? "text" : "password"}
                      className={`input-field pr-10 ${senhasDivertem ? "border-rust focus:ring-rust/30" : ""}`}
                      placeholder="Repita a senha"
                      value={confirmarSenha}
                      onChange={e => setConfirmarSenha(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmar(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400 hover:text-forest"
                    >
                      {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {senhasDivertem && (
                    <p className="text-xs text-rust mt-1">As senhas não coincidem.</p>
                  )}
                  {!senhasDivertem && novaSenha && confirmarSenha && (
                    <p className="text-xs text-green-700 mt-1">✓ Senhas coincidem.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── Dados Gerais ── */}
        <Section icon={User} title="Dados Gerais">
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
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome completo <span className="text-rust">*</span></label>
              <input name="nome_completo" type="text" className="input-field" required defaultValue={profile.nome_completo} />
            </div>
            <div>
              <label className="label">Data de nascimento <span className="text-rust">*</span></label>
              <input name="data_nascimento" type="date" className="input-field" required defaultValue={prof.data_nascimento ?? ""} />
            </div>
            <div>
              <label className="label">Sexo <span className="text-rust">*</span></label>
              <select name="sexo" className="input-field" required defaultValue={prof.sexo ?? ""}>
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
              <input name="telefone_1" type="text" className="input-field" placeholder="(00) 00000-0000 ou +XX XXXXXXXXX"
                value={tel1} onChange={e => setTel1(maskPhone(e.target.value))} />
            </div>
            <div>
              <label className="label">Telefone 2</label>
              <input name="telefone_2" type="text" className="input-field" placeholder="(00) 00000-0000 ou +XX XXXXXXXXX"
                value={tel2} onChange={e => setTel2(maskPhone(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea name="observacoes" rows={3} className="input-field resize-none" placeholder="Informações relevantes…" defaultValue={prof.observacoes ?? ""} />
          </div>
        </Section>

        {/* ── Dados Profissionais ── */}
        <Section icon={Stethoscope} title="Dados Profissionais">
          <div className="grid sm:grid-cols-2 gap-4">
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
                  {especialidadesList.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
                <AddEspecialidadeButton
                  onAdded={esp => {
                    setEspecialidadesList(prev => [...prev, esp]);
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
              <input name="registro_profissional" type="text" className="input-field" placeholder="Ex: CRP 08/12345" defaultValue={prof.registro_profissional ?? ""} />
            </div>
            <div>
              <label className="label">Valor Consulta Avulsa</label>
              <MoneyInput name="valor_consulta" defaultValue={prof.valor_consulta} />
            </div>
            <div>
              <label className="label">Valor Plano</label>
              <MoneyInput name="valor_plano" defaultValue={prof.valor_plano} />
            </div>
          </div>
        </Section>

      </form>
    </div>
  );
}
