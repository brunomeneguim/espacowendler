"use client";

import { useState, useTransition } from "react";
import { Settings, X, Loader2 } from "lucide-react";
import { salvarConfigCampos } from "./actions";

interface CampoConfig { campo: string; obrigatorio: boolean }

const CAMPOS_LABELS: Record<string, string> = {
  nome_completo:                  "Nome completo",
  data_nascimento:                "Data de nascimento",
  cpf_cnpj:                       "CPF ou CNPJ",
  sexo:                           "Sexo",
  rg:                             "RG",
  emite_nfse:                     "Emissão de NFS-e",
  responsavel_nome:               "Nome do responsável",
  responsavel_data_nascimento:    "Data de nasc. do responsável",
  responsavel_cpf:                "CPF do responsável",
  foto:                           "Foto",
  cep:                            "CEP",
  estado:                         "Estado",
  cidade:                         "Cidade",
  bairro:                         "Bairro",
  endereco:                       "Endereço",
  numero:                         "Número",
  telefone_1:                     "Telefone 1",
  telefone_2:                     "Telefone 2",
  email:                          "E-mail",
  instagram:                      "Instagram",
  contato_emergencia_nome:        "Nome do contato de emergência",
  contato_emergencia_telefone:    "Telefone do contato de emergência",
  estado_civil:                   "Estado civil",
  profissao:                      "Profissão",
  grau_instrucao:                 "Grau de instrução",
  indicacao:                      "Como nos conheceu",
  observacoes:                    "Observações",
};

// Campos que NUNCA podem ser opcionais (obrigatórios por regra de negócio)
const SEMPRE_OBRIGATORIOS = new Set(["nome_completo", "data_nascimento", "cpf_cnpj", "sexo"]);

const GRUPOS = [
  { label: "Dados Pessoais", campos: ["foto","rg","emite_nfse","responsavel_nome","responsavel_data_nascimento","responsavel_cpf"] },
  { label: "Endereço",       campos: ["cep","estado","cidade","bairro","endereco","numero"] },
  { label: "Contato",        campos: ["telefone_1","telefone_2","email","instagram","contato_emergencia_nome","contato_emergencia_telefone"] },
  { label: "Dados Complementares", campos: ["estado_civil","profissao","grau_instrucao","indicacao","observacoes"] },
];

interface Props { initialConfigs: CampoConfig[] }

export function ConfigCamposButton({ initialConfigs }: Props) {
  const [open, setOpen] = useState(false);
  const [configs, setConfigs] = useState<CampoConfig[]>(initialConfigs);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(campo: string, value: boolean) {
    if (SEMPRE_OBRIGATORIOS.has(campo)) return;
    setConfigs(p => p.map(c => c.campo === campo ? { ...c, obrigatorio: value } : c));
    setSaved(false);
  }

  function isObrigatorio(campo: string) {
    if (SEMPRE_OBRIGATORIOS.has(campo)) return true;
    return configs.find(c => c.campo === campo)?.obrigatorio ?? false;
  }

  function handleSave() {
    startTransition(async () => {
      await salvarConfigCampos(configs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest-500 hover:text-forest transition-colors"
        title="Configurar campos obrigatórios"
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand/30 bg-cream/60">
              <div>
                <p className="text-xs uppercase tracking-wider text-forest-500">Configurações</p>
                <p className="font-display text-lg text-forest">Campos obrigatórios</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-forest/10 text-forest-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <p className="text-sm text-forest-500">
                Defina quais campos são obrigatórios no cadastro de pacientes.
                Os campos em cinza não podem ser alterados.
              </p>

              {/* Campos fixos */}
              <div className="p-3 bg-forest/5 rounded-xl space-y-2">
                <p className="text-xs font-medium text-forest-500 uppercase tracking-wider">Sempre obrigatórios</p>
                {[...SEMPRE_OBRIGATORIOS].map(campo => (
                  <div key={campo} className="flex items-center justify-between py-1">
                    <span className="text-sm text-forest-700">{CAMPOS_LABELS[campo] ?? campo}</span>
                    <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full">Fixo</span>
                  </div>
                ))}
              </div>

              {/* Grupos configuráveis */}
              {GRUPOS.map(grupo => (
                <div key={grupo.label}>
                  <p className="text-xs font-medium text-forest-500 uppercase tracking-wider mb-2">{grupo.label}</p>
                  <div className="space-y-1">
                    {grupo.campos.map(campo => {
                      const obrig = isObrigatorio(campo);
                      return (
                        <div key={campo} className="flex items-center justify-between py-1.5 border-b border-sand/20 last:border-0">
                          <span className="text-sm text-forest-700">{CAMPOS_LABELS[campo] ?? campo}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-forest-400">{obrig ? "Obrigatório" : "Opcional"}</span>
                            <div
                              onClick={() => toggle(campo, !obrig)}
                              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${obrig ? "bg-forest" : "bg-sand/60"}`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${obrig ? "translate-x-5" : "translate-x-0.5"}`} />
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-sand/30 bg-cream/40">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : saved ? "✓ Salvo!" : "Salvar configurações"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
