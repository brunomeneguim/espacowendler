"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Camera, Upload, X, Plus, Trash2, Loader2,
  User, MapPin, Phone, FileText, AlertCircle, UserCog, DollarSign, Search,
} from "lucide-react";
import { criarPacienteCompleto } from "../actions";
import { DDISelector } from "./DDISelector";

// ── Tipos ─────────────────────────────────────────────────────────
interface CampoConfig { campo: string; obrigatorio: boolean }
interface ContatoEmergencia { nome: string; relacao: string; telefone: string; ddi: string }
interface ProfissionalOpt { id: string; nome_completo: string }

// ── Masks ─────────────────────────────────────────────────────────
function maskCpfCnpj(v: string) {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) {
    v = v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return v.substring(0, 14);
  }
  v = v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
       .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  return v.substring(0, 18);
}
function maskCep(v: string) {
  v = v.replace(/\D/g, "").substring(0, 8);
  return v.replace(/(\d{5})(\d)/, "$1-$2");
}
function maskPhone(v: string) {
  const raw = v.replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) return "+" + raw.slice(1).replace(/\D/g, "");
  const d = raw.replace(/\D/g, "").substring(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function maskRg(v: string) {
  v = v.replace(/[^0-9Xx]/g, "").substring(0, 9);
  return v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})([0-9Xx])$/, "$1-$2");
}
function calcAge(dob: string) {
  if (!dob) return 99;
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Seção visual ─────────────────────────────────────────────────
function Section({ icon: Icon, title, children, allowOverflow }: { icon: React.ElementType; title: string; children: React.ReactNode; allowOverflow?: boolean }) {
  return (
    <div className={`card p-0 ${allowOverflow ? "overflow-visible" : "overflow-hidden"}`}>
      <div className="flex items-center gap-3 px-5 py-3 bg-forest/5 border-b border-sand/30 rounded-t-[inherit]">
        <Icon className="w-4 h-4 text-forest" />
        <h2 className="font-display text-base text-forest">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Componente de campo de telefone com DDI ────────────────────────
function PhoneFieldWithDDI({
  name, ddiName, value, ddi, onChangeValue, onChangeDdi, placeholder, required,
}: {
  name: string; ddiName: string; value: string; ddi: string;
  onChangeValue: (v: string) => void; onChangeDdi: (d: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-sand/40 focus-within:ring-2 focus-within:ring-forest/20 focus-within:border-forest/40">
      <DDISelector value={ddi} onChange={onChangeDdi} name={ddiName} />
      <input
        name={name} type="text" required={required}
        placeholder={placeholder ?? "(00) 00000-0000"}
        value={value}
        onChange={e => onChangeValue(maskPhone(e.target.value))}
        className="flex-1 px-3 py-2.5 text-sm text-forest placeholder-forest-300 focus:outline-none bg-white border-l border-sand/40"
      />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
interface Props {
  camposConfig: CampoConfig[];
  profissionais: ProfissionalOpt[];
  fromAgenda?: boolean;
}

export function NovoPacienteForm({ camposConfig, profissionais, fromAgenda }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Foto
  const [foto, setFoto] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Campos dinâmicos
  const [dataNasc, setDataNasc] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [rg, setRg] = useState("");
  const [inicioTratamento, setInicioTratamento] = useState(todayStr());
  const [tel1, setTel1] = useState("");
  const [ddi1, setDdi1] = useState("+55");
  const [tel2, setTel2] = useState("");
  const [ddi2, setDdi2] = useState("+55");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const [endereco, setEndereco] = useState({ estado: "", cidade: "", bairro: "", logradouro: "" });
  const [contatos, setContatos] = useState<ContatoEmergencia[]>([{ nome: "", relacao: "", telefone: "", ddi: "+55" }]);
  const [tipoCadastro, setTipoCadastro] = useState<"individual" | "casal">("individual");
  const [parceiroDataNasc, setParceiroDataNasc] = useState("");
  const [parceiroCpf, setParceiroCpf] = useState("");
  const [parceiroTel, setParceiroTel] = useState("");
  const [parceiroDdi, setParceiroDdi] = useState("+55");
  const [mesmoEndereco, setMesmoEndereco] = useState(true);
  const [parceiroCep, setParceiroCep] = useState("");
  const [parceiroCepLoading, setParceiroCepLoading] = useState(false);
  const [parceiroCepErro, setParceiroCepErro] = useState<string | null>(null);
  const [parceiroEnd, setParceiroEnd] = useState({ estado: "", cidade: "", bairro: "", logradouro: "" });
  const [respDataNasc, setRespDataNasc] = useState("");
  const [respTelefone, setRespTelefone] = useState("");
  const [respDdi, setRespDdi] = useState("+55");
  const [respErro, setRespErro] = useState<string | null>(null);

  // Profissionais vinculados
  const [profSearch, setProfSearch] = useState("");
  const [profSearchOpen, setProfSearchOpen] = useState(false);
  const [profVinculados, setProfVinculados] = useState<ProfissionalOpt[]>([]);
  const profSearchResults = profSearchOpen
    ? profissionais.filter(
        p => p.nome_completo.toLowerCase().includes(profSearch.toLowerCase()) &&
          !profVinculados.find(v => v.id === p.id)
      )
    : [];

  // Responsável financeiro
  const [respFinMesmoPaciente, setRespFinMesmoPaciente] = useState(false);
  const [respFinNome, setRespFinNome] = useState("");
  const [respFinTel, setRespFinTel] = useState("");
  const [respFinDdi, setRespFinDdi] = useState("+55");
  const [respFinCpf, setRespFinCpf] = useState("");
  const [respFinMesmoEnd, setRespFinMesmoEnd] = useState(false);
  const [respFinCep, setRespFinCep] = useState("");
  const [respFinCepLoading, setRespFinCepLoading] = useState(false);
  const [respFinCepErro, setRespFinCepErro] = useState<string | null>(null);
  const [respFinEnd, setRespFinEnd] = useState({ estado: "", cidade: "", bairro: "", logradouro: "" });

  const isMinor = dataNasc ? calcAge(dataNasc) < 18 : false;
  const isReq = (c: string) => camposConfig.find(x => x.campo === c)?.obrigatorio ?? false;

  // ── Webcam ──
  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setShowWebcam(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch { alert("Não foi possível acessar a câmera."); }
  }
  function stopWebcam() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowWebcam(false);
  }
  function capturePhoto() {
    const v = videoRef.current; if (!v) return;
    const MAX = 400, r = Math.min(MAX / v.videoWidth, MAX / v.videoHeight);
    const c = document.createElement("canvas");
    c.width = v.videoWidth * r; c.height = v.videoHeight * r;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    setFoto(c.toDataURL("image/jpeg", 0.8));
    stopWebcam();
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

  // ── CEP auto-fill ──
  async function fetchCep(
    v: string,
    setter: (e: { estado: string; cidade: string; bairro: string; logradouro: string }) => void,
    setLoading: (b: boolean) => void,
    setErro: (e: string | null) => void,
  ) {
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setErro(null);
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErro("CEP não encontrado.");
      } else {
        setter({ estado: data.uf, cidade: data.localidade, bairro: data.bairro, logradouro: data.logradouro });
      }
    } catch {
      setErro("Não foi possível consultar o CEP. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  // ── Submit ──
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (isMinor && respDataNasc) {
      const idade = calcAge(respDataNasc);
      if (idade < 18) {
        setRespErro("O responsável deve ter pelo menos 18 anos. Informe outro responsável.");
        return;
      }
    }
    setRespErro(null);

    const fd = new FormData(e.currentTarget);
    fd.set("foto_url", foto ?? "");
    fd.set("contatos_emergencia", JSON.stringify(contatos));
    fd.set("parceiro_mesmo_endereco", mesmoEndereco ? "true" : "false");
    fd.set("resp_fin_mesmo_paciente", respFinMesmoPaciente ? "true" : "false");
    fd.set("resp_fin_mesmo_endereco", respFinMesmoEnd ? "true" : "false");
    // Profissionais vinculados
    profVinculados.forEach(p => fd.append("profissional_ids", p.id));

    setErro(null);
    startTransition(async () => {
      const res = await criarPacienteCompleto(fd);
      if (res.error) setErro(res.error);
      else if (fromAgenda && res.id) router.push(`/agenda/novo?paciente_id=${res.id}`);
      else router.push("/pacientes");
    });
  }

  const req = (label: string, campo: string) => (
    <label className="label">
      {label}
      {isReq(campo) && <span className="text-rust ml-1">*</span>}
    </label>
  );

  return (
    <div className="space-y-5">
      {erro && (
        <div className="flex items-start gap-2 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Toggle Individual / Casal ── */}
        <input type="hidden" name="tipo_cadastro" value={tipoCadastro} />
        <div className="flex gap-1 p-1 bg-sand/20 rounded-xl w-fit">
          {(["individual", "casal"] as const).map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoCadastro(tipo)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tipoCadastro === tipo ? "bg-white text-forest shadow-sm" : "text-forest-500 hover:text-forest hover:bg-white/50"}`}
            >
              {tipo === "individual" ? "👤 Paciente Individual" : "👫 Casal"}
            </button>
          ))}
        </div>

        {/* ── Profissional Responsável ── */}
        <Section icon={UserCog} title="Profissional Responsável" allowOverflow>
          <p className="text-sm text-forest-500">Vincule um ou mais profissionais responsáveis por este paciente.</p>
          <div className="relative">
            <div className="flex items-center gap-2 border border-sand/40 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-forest/20">
              <Search className="w-4 h-4 text-forest-400 shrink-0" />
              <input
                type="text"
                placeholder="Clique para ver ou digite para filtrar…"
                value={profSearch}
                onChange={e => setProfSearch(e.target.value)}
                onFocus={() => setProfSearchOpen(true)}
                onBlur={() => setTimeout(() => setProfSearchOpen(false), 150)}
                className="flex-1 text-sm focus:outline-none bg-transparent"
              />
            </div>
            {profSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-sand/40 rounded-xl shadow-lg z-20 overflow-hidden">
                {profSearchResults.slice(0, 6).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProfVinculados(prev => [...prev, p]); setProfSearch(""); setProfSearchOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-sand/20 transition-colors text-forest"
                  >
                    <UserCog className="w-4 h-4 text-forest-400 shrink-0" />
                    {p.nome_completo}
                  </button>
                ))}
              </div>
            )}
          </div>
          {profVinculados.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {profVinculados.map(p => (
                <span key={p.id} className="flex items-center gap-1.5 bg-forest/10 text-forest text-sm px-3 py-1.5 rounded-full">
                  <UserCog className="w-3.5 h-3.5" />
                  {p.nome_completo}
                  <button type="button" onClick={() => setProfVinculados(prev => prev.filter(v => v.id !== p.id))} className="ml-1 text-forest-400 hover:text-rust transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* ── Dados Pessoais ── */}
        <Section icon={User} title={tipoCadastro === "casal" ? "Dados Pessoais — Paciente 1" : "Dados Pessoais"}>
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
              <p className="text-xs text-forest-500">Foto do paciente {isReq("foto") ? <span className="text-rust">*</span> : <span className="text-forest-400">(opcional)</span>}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startWebcam} className="flex items-center gap-1.5 text-xs bg-forest text-cream px-3 py-1.5 rounded-lg hover:bg-forest/90 transition-colors">
                  <Camera className="w-3.5 h-3.5" /> Tirar foto
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs border border-sand/40 px-3 py-1.5 rounded-lg hover:bg-sand/20 text-forest transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Selecionar arquivo
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <p className="text-xs text-forest-400">Data de cadastro: {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {req("Nome completo", "nome_completo")}
              <input name="nome_completo" type="text" className="input-field" required={isReq("nome_completo")} placeholder="Nome completo do paciente" />
            </div>
            <div>
              {req("Data de nascimento", "data_nascimento")}
              <input name="data_nascimento" type="date" className="input-field" required={isReq("data_nascimento")}
                value={dataNasc} onChange={e => setDataNasc(e.target.value)} />
              {dataNasc && isMinor && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Menor de idade — dados do responsável obrigatórios
                </p>
              )}
            </div>
            <div>
              <label className="label">Início do Tratamento <span className="text-rust">*</span></label>
              <input name="inicio_tratamento" type="date" className="input-field" required
                value={inicioTratamento} onChange={e => setInicioTratamento(e.target.value)} />
            </div>
            <div>
              {req("CPF ou CNPJ", "cpf_cnpj")}
              <input name="cpf_cnpj" type="text" className="input-field" required={isReq("cpf_cnpj")}
                placeholder="000.000.000-00" value={cpfCnpj}
                onChange={e => setCpfCnpj(maskCpfCnpj(e.target.value))} />
            </div>
            <div>
              {req("RG", "rg")}
              <input name="rg" type="text" className="input-field" required={isReq("rg")}
                placeholder="00.000.000-0" value={rg} onChange={e => setRg(maskRg(e.target.value))} />
            </div>
            <div>
              {req("Sexo", "sexo")}
              <select name="sexo" className="input-field" required={isReq("sexo")} defaultValue="">
                <option value="" disabled>Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Responsável — só aparece se menor de idade */}
          {isMinor && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <p className="text-sm font-medium text-amber-800">Responsável legal</p>
              {respErro && (
                <div className="flex items-start gap-2 p-2.5 bg-rust/10 border border-rust/30 rounded-lg text-sm text-rust">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {respErro}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  {req("Nome do responsável", "responsavel_nome")}
                  <input name="responsavel_nome" type="text" className="input-field" required={isMinor} placeholder="Nome completo" />
                </div>
                <div>
                  {req("Relação com o paciente", "responsavel_relacao")}
                  <select name="responsavel_relacao" className="input-field" required={isMinor} defaultValue="">
                    <option value="" disabled>Selecione</option>
                    <option value="mae">Mãe</option>
                    <option value="pai">Pai</option>
                    <option value="avo">Avó / Avô</option>
                    <option value="tio">Tio / Tia</option>
                    <option value="conjuge">Cônjuge</option>
                    <option value="irmao">Irmão / Irmã</option>
                    <option value="tutor_legal">Tutor legal</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  {req("Telefone do responsável", "responsavel_telefone")}
                  <PhoneFieldWithDDI
                    name="responsavel_telefone" ddiName="responsavel_ddi"
                    value={respTelefone} ddi={respDdi}
                    onChangeValue={setRespTelefone} onChangeDdi={setRespDdi}
                    required={isMinor}
                  />
                </div>
                <div>
                  {req("Data de nasc. do responsável", "responsavel_data_nascimento")}
                  <input
                    name="responsavel_data_nascimento" type="date"
                    className={`input-field ${respDataNasc && calcAge(respDataNasc) < 18 ? "border-rust focus:ring-rust/30" : ""}`}
                    required={isMinor} value={respDataNasc}
                    onChange={e => {
                      setRespDataNasc(e.target.value);
                      if (e.target.value && calcAge(e.target.value) < 18) {
                        setRespErro("O responsável deve ter pelo menos 18 anos. Informe outro responsável.");
                      } else {
                        setRespErro(null);
                      }
                    }}
                  />
                </div>
                <div>
                  {req("CPF do responsável", "responsavel_cpf")}
                  <input name="responsavel_cpf" type="text" className="input-field" required={isMinor} placeholder="000.000.000-00" maxLength={14} />
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ── Endereço ── */}
        <Section icon={MapPin} title="Endereço">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              {req("CEP", "cep")}
              <div className="relative">
                <input name="cep" type="text" className={`input-field pr-8 ${cepErro ? "border-rust focus:ring-rust/30" : ""}`} required={isReq("cep")}
                  placeholder="00000-000" value={cep}
                  onChange={e => {
                    const val = maskCep(e.target.value);
                    setCep(val);
                    setCepErro(null);
                    if (!val.replace(/\D/g, "")) setEndereco({ estado: "", cidade: "", bairro: "", logradouro: "" });
                  }}
                  onBlur={e => fetchCep(e.target.value, setEndereco, setCepLoading, setCepErro)} />
                {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-forest-400" />}
              </div>
              {cepErro && <p className="text-xs text-rust mt-1">{cepErro}</p>}
            </div>
            <div>
              {req("Estado", "estado")}
              <input name="estado" type="text" className="input-field" required={isReq("estado")}
                placeholder="UF" value={endereco.estado} maxLength={2}
                onChange={e => setEndereco(p => ({ ...p, estado: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              {req("Cidade", "cidade")}
              <input name="cidade" type="text" className="input-field" required={isReq("cidade")}
                placeholder="Cidade" value={endereco.cidade}
                onChange={e => setEndereco(p => ({ ...p, cidade: e.target.value }))} />
            </div>
            <div>
              {req("Bairro", "bairro")}
              <input name="bairro" type="text" className="input-field" required={isReq("bairro")}
                placeholder="Bairro" value={endereco.bairro}
                onChange={e => setEndereco(p => ({ ...p, bairro: e.target.value }))} />
            </div>
            <div>
              {req("Endereço", "endereco")}
              <input name="endereco" type="text" className="input-field" required={isReq("endereco")}
                placeholder="Rua / Avenida" value={endereco.logradouro}
                onChange={e => setEndereco(p => ({ ...p, logradouro: e.target.value }))} />
            </div>
            <div>
              {req("Número", "numero")}
              <input name="numero" type="text" className="input-field" required={isReq("numero")} placeholder="Nº" />
            </div>
          </div>
        </Section>

        {/* ── Dados do Parceiro(a) — só para casal ── */}
        {tipoCadastro === "casal" && (
          <Section icon={User} title="Dados Pessoais — Parceiro(a)">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nome completo <span className="text-rust">*</span></label>
                <input name="parceiro_nome" type="text" className="input-field" required placeholder="Nome completo do(a) parceiro(a)" />
              </div>
              <div>
                <label className="label">Data de nascimento</label>
                <input name="parceiro_data_nascimento" type="date" className="input-field"
                  value={parceiroDataNasc} onChange={e => setParceiroDataNasc(e.target.value)} />
              </div>
              <div>
                <label className="label">Sexo</label>
                <select name="parceiro_sexo" className="input-field" defaultValue="">
                  <option value="" disabled>Selecione</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="label">CPF</label>
                <input name="parceiro_cpf" type="text" className="input-field" placeholder="000.000.000-00"
                  value={parceiroCpf} onChange={e => setParceiroCpf(maskCpfCnpj(e.target.value))} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <PhoneFieldWithDDI
                  name="parceiro_telefone" ddiName="parceiro_ddi"
                  value={parceiroTel} ddi={parceiroDdi}
                  onChangeValue={setParceiroTel} onChangeDdi={setParceiroDdi}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">E-mail</label>
                <input name="parceiro_email" type="email" className="input-field" placeholder="email@exemplo.com" />
              </div>
            </div>

            {/* Endereço do parceiro */}
            <div className="pt-2 border-t border-sand/20">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={mesmoEndereco} onChange={e => setMesmoEndereco(e.target.checked)} className="w-4 h-4 accent-forest rounded" />
                <span className="text-sm text-forest-700">Parceiro(a) mora no mesmo endereço</span>
              </label>

              {!mesmoEndereco && (
                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">CEP</label>
                    <div className="relative">
                      <input name="parceiro_cep" type="text" className={`input-field pr-8 ${parceiroCepErro ? "border-rust focus:ring-rust/30" : ""}`} placeholder="00000-000"
                        value={parceiroCep}
                        onChange={e => { const v = maskCep(e.target.value); setParceiroCep(v); setParceiroCepErro(null); if (!v.replace(/\D/g, "")) setParceiroEnd({ estado: "", cidade: "", bairro: "", logradouro: "" }); }}
                        onBlur={e => fetchCep(e.target.value, setParceiroEnd, setParceiroCepLoading, setParceiroCepErro)}
                      />
                      {parceiroCepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-forest-400" />}
                    </div>
                    {parceiroCepErro && <p className="text-xs text-rust mt-1">{parceiroCepErro}</p>}
                  </div>
                  <div>
                    <label className="label">Estado</label>
                    <input name="parceiro_estado" type="text" className="input-field" placeholder="UF" maxLength={2}
                      value={parceiroEnd.estado} onChange={e => setParceiroEnd(p => ({ ...p, estado: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <label className="label">Cidade</label>
                    <input name="parceiro_cidade" type="text" className="input-field" placeholder="Cidade"
                      value={parceiroEnd.cidade} onChange={e => setParceiroEnd(p => ({ ...p, cidade: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Bairro</label>
                    <input name="parceiro_bairro" type="text" className="input-field" placeholder="Bairro"
                      value={parceiroEnd.bairro} onChange={e => setParceiroEnd(p => ({ ...p, bairro: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Endereço</label>
                    <input name="parceiro_endereco" type="text" className="input-field" placeholder="Rua / Avenida"
                      value={parceiroEnd.logradouro} onChange={e => setParceiroEnd(p => ({ ...p, logradouro: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Número</label>
                    <input name="parceiro_numero" type="text" className="input-field" placeholder="Nº" />
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Dados Complementares ── */}
        <Section icon={FileText} title="Dados Complementares">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {req("Estado civil", "estado_civil")}
              <select name="estado_civil" className="input-field" required={isReq("estado_civil")} defaultValue="">
                <option value="" disabled>Selecione</option>
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="uniao_estavel">União estável</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viuvo">Viúvo(a)</option>
                <option value="separado">Separado(a)</option>
              </select>
            </div>
            <div>
              {req("Profissão", "profissao")}
              <input name="profissao" type="text" className="input-field" required={isReq("profissao")} placeholder="Ex: Engenheiro, Professora…" />
            </div>
            <div>
              {req("Grau de escolaridade", "grau_instrucao")}
              <select name="grau_instrucao" className="input-field" required={isReq("grau_instrucao")} defaultValue="">
                <option value="" disabled>Selecione</option>
                <option value="fundamental_incompleto">Fundamental incompleto</option>
                <option value="fundamental_completo">Fundamental completo</option>
                <option value="medio_incompleto">Médio incompleto</option>
                <option value="medio_completo">Médio completo</option>
                <option value="superior_incompleto">Superior incompleto</option>
                <option value="superior_completo">Superior completo</option>
                <option value="pos_graduacao">Pós-graduação / MBA</option>
                <option value="mestrado">Mestrado</option>
                <option value="doutorado">Doutorado</option>
              </select>
            </div>
            <div>
              {req("Como nos conheceu", "indicacao")}
              <input name="indicacao" type="text" className="input-field" required={isReq("indicacao")} placeholder="Indicação, Google, Instagram…" />
            </div>
            <div className="sm:col-span-2">
              {req("Observações", "observacoes")}
              <textarea name="observacoes" rows={3} className="input-field resize-none" required={isReq("observacoes")} placeholder="Informações relevantes sobre o paciente…" />
            </div>
          </div>
        </Section>

        {/* ── Responsável Financeiro ── */}
        <Section icon={DollarSign} title="Responsável Financeiro">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" name="resp_fin_tipo" value="mesmo" checked={respFinMesmoPaciente}
                onChange={() => setRespFinMesmoPaciente(true)} className="accent-forest" />
              <span className="text-sm text-forest">O próprio paciente</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" name="resp_fin_tipo" value="outro" checked={!respFinMesmoPaciente}
                onChange={() => setRespFinMesmoPaciente(false)} className="accent-forest" />
              <span className="text-sm text-forest">Outro responsável</span>
            </label>
          </div>

          {/* NF-e — sempre visível */}
          <div className="flex items-center gap-2">
            <input name="emite_nfse" type="checkbox" id="emite_nfse" value="true" className="w-4 h-4 accent-forest rounded" />
            <label htmlFor="emite_nfse" className="text-sm text-forest cursor-pointer">Paciente solicita emissão de NFS-e</label>
          </div>

          {!respFinMesmoPaciente && (
            <div className="space-y-4 pt-2 border-t border-sand/20">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nome do responsável financeiro</label>
                  <input name="resp_fin_nome" type="text" className="input-field" placeholder="Nome completo"
                    value={respFinNome} onChange={e => setRespFinNome(e.target.value)} />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input name="resp_fin_email" type="email" className="input-field" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="label">CPF</label>
                  <input name="resp_fin_cpf" type="text" className="input-field" placeholder="000.000.000-00"
                    value={respFinCpf} onChange={e => setRespFinCpf(maskCpfCnpj(e.target.value))} />
                </div>
                <div>
                  <label className="label">Parentesco</label>
                  <select name="resp_fin_parentesco" className="input-field" defaultValue="">
                    <option value="" disabled>Selecione</option>
                    <option value="conjuge">Cônjuge / Companheiro(a)</option>
                    <option value="mae">Mãe</option>
                    <option value="pai">Pai</option>
                    <option value="filho">Filho(a)</option>
                    <option value="irmao">Irmão / Irmã</option>
                    <option value="avo">Avó / Avô</option>
                    <option value="tio">Tio / Tia</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="label">Contato (telefone)</label>
                  <PhoneFieldWithDDI
                    name="resp_fin_telefone" ddiName="resp_fin_ddi"
                    value={respFinTel} ddi={respFinDdi}
                    onChangeValue={setRespFinTel} onChangeDdi={setRespFinDdi}
                  />
                </div>
              </div>

              {/* Endereço do responsável financeiro */}
              <div className="pt-2 border-t border-sand/20 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={respFinMesmoEnd} onChange={e => setRespFinMesmoEnd(e.target.checked)} className="w-4 h-4 accent-forest rounded" />
                  <span className="text-sm text-forest-700">Endereço igual ao do paciente</span>
                </label>

                {!respFinMesmoEnd && (
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="label">CEP</label>
                      <div className="relative">
                        <input name="resp_fin_cep" type="text" className={`input-field pr-8 ${respFinCepErro ? "border-rust focus:ring-rust/30" : ""}`} placeholder="00000-000"
                          value={respFinCep}
                          onChange={e => { const v = maskCep(e.target.value); setRespFinCep(v); setRespFinCepErro(null); if (!v.replace(/\D/g, "")) setRespFinEnd({ estado: "", cidade: "", bairro: "", logradouro: "" }); }}
                          onBlur={e => fetchCep(e.target.value, setRespFinEnd, setRespFinCepLoading, setRespFinCepErro)}
                        />
                        {respFinCepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-forest-400" />}
                      </div>
                      {respFinCepErro && <p className="text-xs text-rust mt-1">{respFinCepErro}</p>}
                    </div>
                    <div>
                      <label className="label">Estado</label>
                      <input name="resp_fin_estado" type="text" className="input-field" placeholder="UF" maxLength={2}
                        value={respFinEnd.estado} onChange={e => setRespFinEnd(p => ({ ...p, estado: e.target.value.toUpperCase() }))} />
                    </div>
                    <div>
                      <label className="label">Cidade</label>
                      <input name="resp_fin_cidade" type="text" className="input-field" placeholder="Cidade"
                        value={respFinEnd.cidade} onChange={e => setRespFinEnd(p => ({ ...p, cidade: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Bairro</label>
                      <input name="resp_fin_bairro" type="text" className="input-field" placeholder="Bairro"
                        value={respFinEnd.bairro} onChange={e => setRespFinEnd(p => ({ ...p, bairro: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Logradouro</label>
                      <input name="resp_fin_logradouro" type="text" className="input-field" placeholder="Rua / Avenida"
                        value={respFinEnd.logradouro} onChange={e => setRespFinEnd(p => ({ ...p, logradouro: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Número</label>
                      <input name="resp_fin_numero" type="text" className="input-field" placeholder="Nº" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ── Contato ── */}
        <Section icon={Phone} title="Contato">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {req("Telefone 1", "telefone_1")}
              <PhoneFieldWithDDI
                name="telefone_1" ddiName="ddi_telefone_1"
                value={tel1} ddi={ddi1}
                onChangeValue={setTel1} onChangeDdi={setDdi1}
                required={isReq("telefone_1")}
              />
            </div>
            <div>
              {req("Telefone 2", "telefone_2")}
              <PhoneFieldWithDDI
                name="telefone_2" ddiName="ddi_telefone_2"
                value={tel2} ddi={ddi2}
                onChangeValue={setTel2} onChangeDdi={setDdi2}
                required={isReq("telefone_2")}
              />
            </div>
            <div>
              {req("E-mail", "email")}
              <input name="email" type="email" className="input-field" required={isReq("email")} placeholder="email@exemplo.com" />
            </div>
            <div>
              {req("Instagram", "instagram")}
              <input name="instagram" type="text" className="input-field" required={isReq("instagram")} placeholder="@usuario" />
            </div>
          </div>

          {/* Contatos de emergência */}
          <div className="pt-2">
            <p className="text-sm font-medium text-forest mb-3">Contatos de emergência</p>
            <div className="space-y-3">
              {contatos.map((c, i) => (
                <div key={i} className="p-3 bg-sand/10 rounded-xl border border-sand/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-forest-500">Contato {i + 1}</span>
                    {contatos.length > 1 && (
                      <button type="button" onClick={() => setContatos(p => p.filter((_, j) => j !== i))}
                        className="text-rust hover:text-rust/80 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label text-xs">Nome completo</label>
                      <input type="text" className="input-field py-1.5 text-sm" placeholder="Nome"
                        value={c.nome} onChange={e => setContatos(p => p.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} />
                    </div>
                    <div>
                      <label className="label text-xs">Relação</label>
                      <input type="text" className="input-field py-1.5 text-sm" placeholder="Mãe, pai, cônjuge…"
                        value={c.relacao} onChange={e => setContatos(p => p.map((x, j) => j === i ? { ...x, relacao: e.target.value } : x))} />
                    </div>
                    <div>
                      <label className="label text-xs">Telefone</label>
                      <div className="flex rounded-lg overflow-hidden border border-sand/40">
                        <DDISelector value={c.ddi} onChange={d => setContatos(p => p.map((x, j) => j === i ? { ...x, ddi: d } : x))} name={`contato_ddi_${i}`} />
                        <input type="text" className="flex-1 px-2 py-1.5 text-sm focus:outline-none bg-white border-l border-sand/40" placeholder="(00) 00000-0000"
                          value={c.telefone} onChange={e => setContatos(p => p.map((x, j) => j === i ? { ...x, telefone: maskPhone(e.target.value) } : x))} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setContatos(p => [...p, { nome: "", relacao: "", telefone: "", ddi: "+55" }])}
              className="mt-3 flex items-center gap-1.5 text-sm text-forest border border-dashed border-forest/30 rounded-lg px-3 py-2 hover:bg-forest/5 transition-colors w-full justify-center">
              <Plus className="w-4 h-4" /> Adicionar contato de emergência
            </button>
          </div>
        </Section>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : "Cadastrar paciente"}
          </button>
          <Link href="/pacientes" className="btn-secondary flex-1">Cancelar</Link>
        </div>
      </form>

      {/* ── Modal webcam ── */}
      {showWebcam && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={stopWebcam} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
              <div className="flex items-center justify-between px-5 py-3 border-b border-sand/30">
                <p className="font-display text-forest">Capturar foto</p>
                <button onClick={stopWebcam} className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" />
              </div>
              <div className="px-4 pb-4 flex gap-3">
                <button onClick={capturePhoto} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Capturar
                </button>
                <button onClick={stopWebcam} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
