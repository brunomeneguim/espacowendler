import Link from "next/link";
import { signIn, signInWithGoogle } from "../actions";
import { ErrorBanner } from "@/components/ErrorBanner";

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

      <ErrorBanner message={searchParams.error} />

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

      {/* Divisor */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-sand/40" />
        <span className="text-xs text-forest-400">ou</span>
        <div className="flex-1 h-px bg-sand/40" />
      </div>

      {/* Botão Google */}
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-sand/50 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-forest shadow-sm"
        >
          {/* Google logo SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
            />
          </svg>
          Entrar com Google
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
