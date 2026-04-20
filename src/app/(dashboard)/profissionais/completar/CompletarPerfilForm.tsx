"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, X, Loader2, User, FileText, Lock, AlertCircle,
} from "lucide-react";
import { completarPerfilProfissional } from "../actions";
import { PROF_CORES } from "@/lib/profCores";

// ── CBOS (principais códigos de saúde) ────────────────────────────
export const CBOS_LIST = [
  { codigo: "223104", nome: "Biomédico" },
  { codigo: "223208", nome: "Fisioterapeuta" },
  { codigo: "223305", nome: "Farmacêutico" },
  { codigo: "223405", nome: "Enfermeiro" },
  { codigo: "223505", nome: "Psicólogo clínico" },
  { codigo: "223510", nome: "Psicólogo educacional" },
  { codigo: "223515", nome: "Psicólogo organizacional" },
  { codigo: "223520", nome: "Psicólogo do esporte" },
  { codigo: "223525", nome: "Neuropsicólogo" },
  { codigo: "223604", nome: "Terapeuta ocupacional" },
  { codigo: "223705", nome: "Nutricionista" },
  { codigo: "223810", nome: "Fonoaudiólogo" },
  { codigo: "223905", nome: "Assistente social" },
  { codigo: "225120", nome: "Médico clínico" },
  { codigo: "225125", nome: "Médico de família e comunidade" },
  { codigo: "225130", nome: "Médico ginecologista-obstetra" },
  { codigo: "225142", nome: "Médico pediatra" },
  { codigo: "225150", nome: "Médico psiquiatra" },
  { codigo: "225155", nome: "Médico neurologista" },
  { codigo: "225170", nome: "Médico ortopedista" },
  { codigo: "225195", nome: "Médico cardiologista" },
  { codigo: "226305", nome: "Odontólogo (clínico geral)" },
  { codigo: "226310", nome: "Odontólogo (ortodontista)" },
  { codigo: "322205", nome: "Técnico de enfermagem" },
  { codigo: "322230", nome: "Técnico em saúde bucal" },
  { codigo: "324105", nome: "Técnico em radiologia" },
  { codigo: "519935", nome: "Cuidador de idosos" },
];

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

// ── Masks ──────────────────────────────────────────────────────────
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
  cpf?: string | null; cnpj?: string | null; uf_conselho?: string | null;
  cbos_codigo?: string | null; cbos_nome?: string | null;
  horario_inicio?: string | null; horario_fim?: string | null;
  tempo_atendimento?: number | null; observacoes?: string | null;
  registro_profissional?: string | null; especialidade_id?: number | null;
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
  const [cbosSelecionado, setCbosSelecionado] = useState(profReg?.cbos_codigo ?? "");
  const [corSelecionada, setCorSelecionada] = useState((profReg as any)?.cor ?? "");
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

    // CBOS nome
    const cbosItem = CBOS_LIST.find(c => c.codigo === cbosSelecionado);
    if (cbosItem) { fd.set("cbos_codigo", cbosItem.codigo); fd.set("cbos_nome", cbosItem.nome); }

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
                Foto do profissional {isReq("foto") ? <span className="text-rust">*</span> : <span className="text-forest-400">(opcional)</span>}
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
              {req("UF do Conselho", "uf_conselho")}
              <select name="uf_conselho" className="input-field" required={isReq("uf_conselho")} defaultValue={profReg?.uf_conselho ?? ""}>
                <option value="" disabled>Selecione o estado</option>
                {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              {req("CBOS", "cbos")}
              <select
                name="cbos_codigo"
                className="input-field"
                required={isReq("cbos")}
                value={cbosSelecionado}
                onChange={e => setCbosSelecionado(e.target.value)}
              >
                <option value="" disabled>Selecione o CBOS</option>
                {CBOS_LIST.map(c => (
                  <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Especialidade</label>
              <select name="especialidade_id" className="input-field" defaultValue={profReg?.especialidade_id ?? ""}>
                <option value="">— Sem especialidade —</option>
                {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cor no calendário <span className="text-rust">*</span></label>
              <input type="hidden" name="cor" value={corSelecionada} />
              <div className="flex flex-wrap gap-2 mt-1">
                {coresDisponiveis.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setCorSelecionada(c.id)}
                    className={`w-8 h-8 rounded-full border-4 transition-all ${c.bg} ${corSelecionada === c.id ? "border-forest scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
                  />
                ))}
              </div>
              {corSelecionada && (
                <p className="text-xs text-forest-500 mt-1">
                  Selecionado: <span className="font-medium">{PROF_CORES.find(c => c.id === corSelecionada)?.label}</span>
                </p>
              )}
              {coresDisponiveis.length === 0 && (
                <p className="text-xs text-rust mt-1">Todas as cores já estão em uso. Contate o administrador.</p>
              )}
            </div>
            <div>
              <label className="label">Registro profissional <span className="text-forest-400">(opcional)</span></label>
              <input name="registro_profissional" type="text" className="input-field" placeholder="Ex: CRP 08/12345" defaultValue={profReg?.registro_profissional ?? ""} />
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
              <input name="tempo_atendimento" type="number" min="5" step="5" className="input-field" required={isReq("tempo_atendimento")} placeholder="50" defaultValue={profReg?.tempo_atendimento ?? ""} />
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
              <label className="label">E-mail (login)</label>
              <input type="email" className="input-field opacity-60 cursor-not-allowed" value={profile.email} disabled readOnly />
              <p className="text-xs text-forest-400 mt-1">O e-mail não pode ser alterado.</p>
            </div>
            <p className="text-sm text-forest-500">Altere sua senha abaixo (opcional). Se não quiser alterar, deixe em branco.</p>
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
