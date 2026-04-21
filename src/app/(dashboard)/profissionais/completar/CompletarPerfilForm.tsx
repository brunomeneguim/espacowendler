"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, X, Loader2, User, FileText, Lock, AlertCircle, ChevronDown, Check,
} from "lucide-react";
import { completarPerfilProfissional } from "../actions";
import { PROF_CORES } from "@/lib/profCores";
import { AddEspecialidadeButton } from "../AddEspecialidadeButton";
import { ValorConsultaInput } from "../[id]/editar/ValorConsultaInput";

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
  v = v.replace(/\D/g, "").substring(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
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
interface CampoConfig { campo: string; obrigatorio: boolean }
interface Especialidade { id: number; nome: string }
interface ProfReg {
  foto_url?: string | null; data_nascimento?: string | null; sexo?: string | null;
  cpf?: string | null; cnpj?: string | null;
  horario_inicio?: string | null; horario_fim?: string | null;
  tempo_atendimento?: number | null; observacoes?: string | null;
  registro_profissional?: string | null; especialidade_id?: number | null;
  valor_consulta?: number | null;
}
interface Props {
  profile: { id: string; nome_completo: string; email: string };
  profReg: ProfReg | null;
  especialidades: Especialidade[];
  camposConfig: CampoConfig[];
  coresUsadas: string[];
}

export function CompletarPerfilForm({ profile, profReg, especialidades, camposConfig, coresUsadas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [foto, setFoto] = useState<string | null>(profReg?.foto_url ?? null);
  const [cpf, setCpf] = useState(profReg?.cpf ?? "");
  const [cnpj, setCnpj] = useState(profReg?.cnpj ?? "");
  const [tel1, setTel1] = useState((profReg as any)?.telefone_1 ?? "(42) ");
  const [tel2, setTel2] = useState((profReg as any)?.telefone_2 ?? "(42) ");
  const [corSelecionada, setCorSelecionada] = useState((profReg as any)?.cor ?? "");
  const [especialidadesList, setEspecialidadesList] = useState(especialidades);
  const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState(String(profReg?.especialidade_id ?? ""));
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const coresDisponiveis = PROF_CORES.filter(c => !coresUsadas.includes(c.id) || c.id === corSelecionada);

  const isReq = (c: string) => camposConfig.find(x => x.campo === c)?.obrigatorio ?? false;

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

    // Validação de senha
    const novaSenha = fd.get("nova_senha") as string;
    const confirmarSenha = fd.get("confirmar_senha") as string;
    if (novaSenha || confirmarSenha) {
      if (novaSenha !== confirmarSenha) { setSenhaErro("As senhas não coincidem."); return; }
      if (novaSenha.length < 6) { setSenhaErro("A senha deve ter pelo menos 6 caracteres."); return; }
    }
    setSenhaErro(null);
    setErro(null);

    startTransition(async () => {
      const res = await completarPerfilProfissional(fd);
      if (res.error) setErro(res.error);
      else router.push("/dashboard");
    });
  }

  const req = (label: string, campo: string) => (
    <label className="label">
      {label}{isReq(campo) && <span className="text-rust ml-1">*</span>}
    </label>
  );

  return (
    <div className="space-y-5">
      {erro && (
        <div className="flex items-start gap-2 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
              <p className="text-xs text-forest-500">
                Foto do profissional {isReq("foto") && <span className="text-rust">*</span>}
              </p>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs border border-sand/40 px-3 py-1.5 rounded-lg hover:bg-sand/20 text-forest transition-colors">
                <Upload className="w-3.5 h-3.5" /> Selecionar foto
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <p className="text-xs text-forest-400">Data de cadastro: {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome completo <span className="text-rust">*</span></label>
              <input name="nome_completo" type="text" className="input-field" required placeholder="Seu nome completo" defaultValue={profile.nome_completo} />
            </div>
            <div>
              <label className="label">Data de nascimento <span className="text-rust">*</span></label>
              <input name="data_nascimento" type="date" className="input-field" required defaultValue={profReg?.data_nascimento ?? ""} />
            </div>
            <div>
              <label className="label">Sexo <span className="text-rust">*</span></label>
              <select name="sexo" className="input-field" required defaultValue={profReg?.sexo ?? ""}>
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
              {req("CNPJ", "cnpj")}
              <input name="cnpj" type="text" className="input-field" required={isReq("cnpj")} placeholder="00.000.000/0000-00"
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
              <CorDropdown
                coresUsadas={coresUsadas}
                value={corSelecionada}
                onChange={setCorSelecionada}
              />
            </div>
            <div>
              <label className="label">Registro profissional</label>
              <input name="registro_profissional" type="text" className="input-field" placeholder="Ex: CRP 08/12345" defaultValue={profReg?.registro_profissional ?? ""} />
            </div>
            <div>
              <label className="label">Valor da consulta</label>
              <ValorConsultaInput defaultValue={profReg?.valor_consulta ?? undefined} />
            </div>
          </div>

          {/* Horários e tempo */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              {req("Horário inicial de atendimento", "horario_inicio")}
              <input name="horario_inicio" type="time" className="input-field" required={isReq("horario_inicio")} defaultValue={profReg?.horario_inicio?.slice(0, 5) ?? "08:00"} />
            </div>
            <div>
              {req("Horário final de atendimento", "horario_fim")}
              <input name="horario_fim" type="time" className="input-field" required={isReq("horario_fim")} defaultValue={profReg?.horario_fim?.slice(0, 5) ?? "18:00"} />
            </div>
            <div>
              {req("Tempo de atendimento (min)", "tempo_atendimento")}
              <input name="tempo_atendimento" type="number" min="5" step="5" className="input-field" required={isReq("tempo_atendimento")} placeholder="60" defaultValue={profReg?.tempo_atendimento ?? 60} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Telefone 1</label>
              <input name="telefone_1" type="text" className="input-field" placeholder="(42) 00000-0000"
                value={tel1} onChange={e => setTel1(maskPhone(e.target.value))} />
            </div>
            <div>
              <label className="label">Telefone 2</label>
              <input name="telefone_2" type="text" className="input-field" placeholder="(42) 00000-0000"
                value={tel2} onChange={e => setTel2(maskPhone(e.target.value))} />
            </div>
          </div>

          <div>
            {req("Observações", "observacoes")}
            <textarea name="observacoes" rows={3} className="input-field resize-none" required={isReq("observacoes")} placeholder="Informações relevantes…" defaultValue={profReg?.observacoes ?? ""} />
          </div>
        </Section>

        {/* ── Usuário ── */}
        <Section icon={Lock} title="Usuário">
          <div className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input type="text" className="input-field opacity-60 cursor-not-allowed" value={profile.nome_completo} disabled readOnly />
            </div>
            <p className="text-sm text-forest-500">Altere sua senha abaixo se desejar. Se não quiser alterar, deixe em branco.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nova senha</label>
                <input name="nova_senha" type="password" className="input-field" placeholder="Mínimo 6 caracteres" minLength={6} />
              </div>
              <div>
                <label className="label">Confirmar nova senha</label>
                <input name="confirmar_senha" type="password" className="input-field" placeholder="Repita a senha" />
              </div>
            </div>
            {senhaErro && (
              <p className="text-sm text-rust flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {senhaErro}
              </p>
            )}
          </div>
        </Section>

        {/* Botão */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : "Salvar e continuar"}
          </button>
        </div>
      </form>
    </div>
  );
}
