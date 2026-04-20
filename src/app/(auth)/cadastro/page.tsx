import Link from "next/link";
import { signUp } from "../actions";

export default function CadastroPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <div className="animate-slide-up">
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <Link href="/" className="font-display text-xl text-forest">
          espaço<span className="italic text-rust">wendler</span>
        </Link>
      </div>

      <p className="text-xs uppercase tracking-[0.2em] text-forest-500 mb-3">
        Crie sua conta
      </p>
      <h1 className="font-display text-4xl text-forest mb-2">Cadastro</h1>
      <p className="text-forest-600 mb-8">
        Poucos dados — para começar a cuidar de você.
      </p>

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {searchParams.error}
        </div>
      )}
      {searchParams.message && (
        <div className="mb-5 p-3 bg-forest/10 border border-forest/20 rounded-xl text-sm text-forest">
          {searchParams.message}
        </div>
      )}

      <form action={signUp} className="space-y-4">
        <div>
          <label htmlFor="nome_completo" className="label">
            Nome completo
          </label>
          <input
            id="nome_completo"
            name="nome_completo"
            type="text"
            required
            placeholder="Como você quer ser chamado(a)"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="voce@exemplo.com"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="telefone" className="label">
            Telefone (WhatsApp)
          </label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            placeholder="(00) 00000-0000"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="input-field"
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-6">
          Criar conta
        </button>
      </form>

      <p className="mt-6 text-sm text-forest-600 text-center">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-rust font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
