import Link from "next/link";
import { signIn } from "../actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; redirectTo?: string };
}) {
  return (
    <div className="animate-slide-up">
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <Link href="/" className="font-display text-xl text-forest">
          espaço<span className="italic text-rust">wendler</span>
        </Link>
      </div>

      <p className="text-xs uppercase tracking-[0.2em] text-forest-500 mb-3">
        Bem-vindo de volta
      </p>
      <h1 className="font-display text-4xl text-forest mb-2">Entrar</h1>
      <p className="text-forest-600 mb-8">
        Acesse sua conta para ver sua agenda.
      </p>

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {searchParams.error}
        </div>
      )}

      <form action={signIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@exemplo.com"
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
            autoComplete="current-password"
            placeholder="Sua senha"
            className="input-field"
          />
        </div>

        <button type="submit" className="btn-primary w-full mt-6">
          Entrar
        </button>
      </form>

      <p className="mt-6 text-sm text-forest-600 text-center">
        Ainda não tem uma conta?{" "}
        <Link
          href="/cadastro"
          className="text-rust font-medium hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
