"use client";

import { useState, useRef } from "react";
import { alterarSenha } from "./actions";

export function GerenciarContaClient({ email }: { email: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    const formData = new FormData(e.currentTarget);
    const nova = formData.get("nova_senha") as string;
    const confirmar = formData.get("confirmar_senha") as string;

    if (nova !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    const res = await alterarSenha(formData);
    setCarregando(false);

    if (res.error) {
      setErro(res.error);
    } else {
      setSucesso(true);
      formRef.current?.reset();
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-lg">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-cream/50 uppercase tracking-wider mb-1">Configurações</p>
        <h1 className="text-2xl font-display font-semibold">Gerenciar Conta</h1>
      </div>

      {/* Card */}
      <div className="card p-6 space-y-5">
        {/* Email */}
        <div>
          <label className="label">E-mail</label>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="input-field opacity-60 cursor-not-allowed"
          />
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label" htmlFor="nova_senha">Nova Senha</label>
            <input
              id="nova_senha"
              name="nova_senha"
              type="password"
              minLength={6}
              required
              placeholder="Mínimo 6 caracteres"
              className="input-field"
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmar_senha">Confirmar Nova Senha</label>
            <input
              id="confirmar_senha"
              name="confirmar_senha"
              type="password"
              minLength={6}
              required
              placeholder="Repita a nova senha"
              className="input-field"
            />
          </div>

          {erro && (
            <p className="text-sm text-rust">{erro}</p>
          )}

          {sucesso && (
            <p className="text-sm text-peach">Senha alterada com sucesso!</p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="btn-primary w-full disabled:opacity-50"
          >
            {carregando ? "Salvando…" : "Alterar Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
