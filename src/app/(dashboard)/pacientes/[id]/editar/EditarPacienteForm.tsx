"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera, Upload, X, Plus, Trash2, Loader2,
  User, MapPin, Phone, FileText, AlertCircle,
} from "lucide-react";
import { atualizarPacienteCompleto } from "./actions";

interface CampoConfig { campo: string; obrigatorio: boolean }
interface ContatoEmergencia { nome: string; relacao: string; telefone: string }

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
  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "");
    return "+" + digits;
  }
  const digits = raw.replace(/\D/g, "").substring(0, 11);
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
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

interface Props {
  paciente: any;
  camposConfig: CampoConfig[];
}

export function EditarPacienteForm({ paciente, camposConfig }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Foto
  const [foto, setFoto] = useState<string | null>(paciente.foto_url ?? null);
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Campos dinâmicos — pré-preenchidos com dados do paciente
  const [tipoCadastro, setTipoCadastro] = useState<"individual" | "casal">(
    paciente.tipo_cadastro === "casal" ? "casal" : "individual"
  );
  const [dataNasc, setDataNasc] = useState(paciente.data_nascimento ?? "");
  const [cpfCnpj, setCpfCnpj] = useState(paciente.cpf ?? "");
  const [rg, setRg] = useState(paciente.rg ?? "");
  const [tel1, setTel1] = useState(paciente.telefone ?? "");
  const [tel2, setTel2] = useState(paciente.telefone_2 ?? "");
  const [cep, setCep] = useState(paciente.cep ?? "");
  const [cepLoading, setCepLoading] = useState(false);
  const [endereco, setEndereco] = useState({
    estado: paciente.estado ?? "",
    cidade: paciente.cidade ?? "",
    bairro: paciente.bairro ?? "",
    logradouro: paciente.endereco ?? "",
  });
  const [contatos, setContatos] = useState<ContatoEmergencia[]>(
    Array.isArray(paciente.contatos_emergencia) && paciente.contatos_emergencia.length > 0
      ? paciente.contatos_emergencia
      : [{ nome: "", relacao: "", telefone: "" }]
  );
  const [parceiroDataNasc, setParceiroDataNasc] = useState(paciente.parceiro_data_nascimento ?? "");
  const [parceiroCpf, setParceiroCpf] = useState(paciente.parceiro_cpf ?? "");
  const [mesmoEndereco, setMesmoEndereco] = useState(paciente.parceiro_mesmo_endereco !== false);
  const [parceiroCep, setParceiroCep] = useState(paciente.parceiro_cep ?? "");
  const [parceiroCepLoading, setParceiroCepLoading] = useState(false);
  const [parceiroEnd, setParceiroEnd] = useState({
    estado: paciente.parceiro_estado ?? "",
    cidade: paciente.parceiro_cidade ?? "",
    bairro: paciente.parceiro_bairro ?? "",
    logradouro: paciente.parceiro_endereco ?? "",
  });
  const [respDataNasc, setRespDataNasc] = useState(paciente.responsavel_data_nascimento ?? "");
  const [respTelefone, setRespTelefone] = useState(paciente.responsavel_telefone ?? "");
  const [respErro, setRespErro] = useState<string | null>(null);

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

  async function fetchCep(v: string) {
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco({ estado: data.uf, cidade: data.localidade, bairro: data.bairro, logradouro: data.logradouro });
      }
    } catch { /* ignore */ } finally { setCepLoading(false); }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isMinor && respDataNasc) {
      const idade = calcAge(respDataNasc);
      if (idade < 18) {
        setRespErro("O responsável deve ter pelo menos 18 anos.");
        return;
      }
    }
    setRespErro(null);
    const fd = new FormData(e.currentTarget);
    fd.set("foto_url", foto ?? "");
    fd.set("contatos_emergencia", JSON.stringify(contatos));
    fd.set("parceiro_mesmo_endereco", mesmoEndereco ? "true" : "false");
    setErro(null);
    startTransition(async () => {
      const res = await atualizarPacienteCompleto(paciente.id, fd);
      if (res.error) setErro(res.error);
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
              <p className="text-xs text-forest-500">Foto do paciente</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startWebcam} className="flex items-center gap-1.5 text-xs bg-forest text-cream px-3 py-1.5 rounded-lg hover:bg-forest/90 transition-colors">
                  <Camera className="w-3.5 h-3.5" /> Tirar foto
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs border border-sand/40 px-3 py-1.5 rounded-lg hover:bg-sand/20 text-forest transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Selecionar arquivo
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {req("Nome completo", "nome_completo")}
              <input name="nome_completo" type="text" className="input-field" required
                defaultValue={paciente.nome_completo} />
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
              <select name="sexo" className="input-field" required={isReq("sexo")} defaultValue={paciente.sexo ?? ""}>
                <option value="" disabled>Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Responsável — menor de idade */}
          {isMinor && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <p className="text-sm font-medium text-amber-800">Responsável legal</p>
              {respErro && (
                <div className="flex items-start gap-2 p-2.5 bg-rust/10 border border-rust/30 rounded-lg text-sm text-rust">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{respErro}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nome do responsável <span className="text-rust">*</span></label>
                  <input name="responsavel_nome" type="text" className="input-field" required={isMinor}
                    defaultValue={paciente.responsavel_nome ?? ""} placeholder="Nome completo" />
                </div>
                <div>
                  <label className="label">Relação com o paciente <span className="text-rust">*</span></label>
                  <select name="responsavel_relacao" className="input-field" required={isMinor}
                    defaultValue={paciente.responsavel_relacao ?? ""}>
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
                  <label className="label">Telefone do responsável <span className="text-rust">*</span></label>
                  <input name="responsavel_telefone" type="text" className="input-field" required={isMinor}
                    placeholder="(42) 00000-0000" value={respTelefone}
                    onChange={e => setRespTelefone(maskPhone(e.target.value))} />
                </div>
                <div>
                  <label className="label">Data de nasc. do responsável <span className="text-rust">*</span></label>
                  <input name="responsavel_data_nascimento" type="date" className="input-field" required={isMinor}
                    value={respDataNasc}
                    onChange={e => {
                      setRespDataNasc(e.target.value);
                      if (e.target.value && calcAge(e.target.value) < 18) setRespErro("O responsável deve ter pelo menos 18 anos.");
                      else setRespErro(null);
                    }} />
                </div>
                <div>
                  <label className="label">CPF do responsável <span className="text-rust">*</span></label>
                  <input name="responsavel_cpf" type="text" className="input-field" required={isMinor}
                    defaultValue={paciente.responsavel_cpf ?? ""} placeholder="000.000.000-00" maxLength={14} />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input name="emite_nfse" type="checkbox" id="emite_nfse" value="true"
              defaultChecked={paciente.emite_nfse === true}
              className="w-4 h-4 accent-forest rounded" />
            <label htmlFor="emite_nfse" className="text-sm text-forest cursor-pointer">Paciente solicita emissão de NFS-e</label>
          </div>
        </Section>

        {/* ── Endereço ── */}
        <Section icon={MapPin} title="Endereço">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              {req("CEP", "cep")}
              <div className="relative">
                <input name="cep" type="text" className="input-field pr-8" required={isReq("cep")}
                  placeholder="00000-000" value={cep}
                  onChange={e => {
                    const val = maskCep(e.target.value);
                    setCep(val);
                    if (!val.replace(/\D/g, "")) setEndereco({ estado: "", cidade: "", bairro: "", logradouro: "" });
                  }}
                  onBlur={e => fetchCep(e.target.value)} />
                {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-forest-400" />}
              </div>
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
              <input name="numero" type="text" className="input-field" required={isReq("numero")}
                placeholder="Nº" defaultValue={paciente.numero ?? ""} />
            </div>
          </div>
        </Section>

        {/* ── Dados do Parceiro(a) — só para casal ── */}
        {tipoCadastro === "casal" && (
          <Section icon={User} title="Dados Pessoais — Parceiro(a)">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nome completo <span className="text-rust">*</span></label>
                <input name="parceiro_nome" type="text" className="input-field" required
                  defaultValue={paciente.parceiro_nome ?? ""} placeholder="Nome completo do(a) parceiro(a)" />
              </div>
              <div>
                <label className="label">Data de nascimento</label>
                <input name="parceiro_data_nascimento" type="date" className="input-field"
                  value={parceiroDataNasc} onChange={e => setParceiroDataNasc(e.target.value)} />
              </div>
              <div>
                <label className="label">Sexo</label>
                <select name="parceiro_sexo" className="input-field" defaultValue={paciente.parceiro_sexo ?? ""}>
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
                <input name="parceiro_telefone" type="text" className="input-field" placeholder="(42) 00000-0000"
                  defaultValue={paciente.parceiro_telefone ?? ""} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">E-mail</label>
                <input name="parceiro_email" type="email" className="input-field" placeholder="email@exemplo.com"
                  defaultValue={paciente.parceiro_email ?? ""} />
              </div>
            </div>

            <div className="pt-2 border-t border-sand/20">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={mesmoEndereco} onChange={e => setMesmoEndereco(e.target.checked)}
                  className="w-4 h-4 accent-forest rounded" />
                <span className="text-sm text-forest-700">Parceiro(a) mora no mesmo endereço</span>
              </label>

              {!mesmoEndereco && (
                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">CEP</label>
                    <div className="relative">
                      <input name="parceiro_cep" type="text" className="input-field pr-8" placeholder="00000-000"
                        value={parceiroCep}
                        onChange={e => {
                          const v = maskCep(e.target.value);
                          setParceiroCep(v);
                          if (!v.replace(/\D/g, "")) setParceiroEnd({ estado: "", cidade: "", bairro: "", logradouro: "" });
                        }}
                        onBlur={async e => {
                          const digits = e.target.value.replace(/\D/g, "");
                          if (digits.length !== 8) return;
                          setParceiroCepLoading(true);
                          try {
                            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
                            const d = await res.json();
                            if (!d.erro) setParceiroEnd({ estado: d.uf, cidade: d.localidade, bairro: d.bairro, logradouro: d.logradouro });
                          } catch { /* ignore */ } finally { setParceiroCepLoading(false); }
                        }}
                      />
                      {parceiroCepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-forest-400" />}
                    </div>
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
                    <input name="parceiro_numero" type="text" className="input-field" placeholder="Nº"
                      defaultValue={paciente.parceiro_numero ?? ""} />
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Contato ── */}
        <Section icon={Phone} title="Contato">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {req("Telefone 1", "telefone_1")}
              <input name="telefone_1" type="text" className="input-field"
                required={isReq("telefone_1")} placeholder="(00) 00000-0000 ou +XX XXXXXXXXX"
                value={tel1} onChange={e => setTel1(maskPhone(e.target.value))} />
              <p className="text-xs text-forest-400 mt-1">Para número internacional, comece com +</p>
            </div>
            <div>
              {req("Telefone 2", "telefone_2")}
              <input name="telefone_2" type="text" className="input-field"
                required={isReq("telefone_2")} placeholder="(00) 00000-0000 ou +XX XXXXXXXXX"
                value={tel2} onChange={e => setTel2(maskPhone(e.target.value))} />
            </div>
            <div>
              {req("E-mail", "email")}
              <input name="email" type="email" className="input-field" required={isReq("email")}
                defaultValue={paciente.email ?? ""} placeholder="email@exemplo.com" />
            </div>
            <div>
              {req("Instagram", "instagram")}
              <input name="instagram" type="text" className="input-field" required={isReq("instagram")}
                defaultValue={paciente.instagram ?? ""} placeholder="@usuario" />
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
                      <input type="text" className="input-field py-1.5 text-sm" placeholder="(00) 00000-0000"
                        value={c.telefone} onChange={e => setContatos(p => p.map((x, j) => j === i ? { ...x, telefone: maskPhone(e.target.value) } : x))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setContatos(p => [...p, { nome: "", relacao: "", telefone: "" }])}
              className="mt-3 flex items-center gap-1.5 text-sm text-forest border border-dashed border-forest/30 rounded-lg px-3 py-2 hover:bg-forest/5 transition-colors w-full justify-center">
              <Plus className="w-4 h-4" /> Adicionar contato de emergência
            </button>
          </div>
        </Section>

        {/* ── Dados Complementares ── */}
        <Section icon={FileText} title="Dados Complementares">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              {req("Estado civil", "estado_civil")}
              <select name="estado_civil" className="input-field" required={isReq("estado_civil")}
                defaultValue={paciente.estado_civil ?? ""}>
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
              <input name="profissao" type="text" className="input-field" required={isReq("profissao")}
                defaultValue={paciente.profissao ?? ""} placeholder="Ex: Engenheiro, Professora…" />
            </div>
            <div>
              {req("Grau de escolaridade", "grau_instrucao")}
              <select name="grau_instrucao" className="input-field" required={isReq("grau_instrucao")}
                defaultValue={paciente.grau_instrucao ?? ""}>
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
              <input name="indicacao" type="text" className="input-field" required={isReq("indicacao")}
                defaultValue={paciente.indicacao ?? ""} placeholder="Indicação, Google, Instagram…" />
            </div>
            <div className="sm:col-span-2">
              {req("Observações", "observacoes")}
              <textarea name="observacoes" rows={3} className="input-field resize-none" required={isReq("observacoes")}
                defaultValue={paciente.observacoes ?? ""} placeholder="Informações relevantes sobre o paciente…" />
            </div>
          </div>
        </Section>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : "Salvar alterações"}
          </button>
          <Link href="/pacientes" className="btn-ghost">Cancelar</Link>
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
                <button onClick={stopWebcam} className="btn-ghost">Cancelar</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
