import Link from "next/link";
import { Leaf } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — brand/imagem */}
      <div className="hidden lg:flex lg:w-1/2 bg-forest relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest via-forest-600 to-forest-800" />
        <div className="absolute top-20 -left-20 w-96 h-96 bg-peach/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-80 h-80 bg-sand/20 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-cream w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-cream/10 backdrop-blur flex items-center justify-center">
              <Leaf className="w-5 h-5 text-peach" strokeWidth={1.5} />
            </div>
            <span className="font-display text-xl">
              espaço<span className="italic text-peach">wendler</span>
            </span>
          </Link>
          <div className="max-w-md">
            <p className="text-xs uppercase tracking-[0.2em] text-peach mb-4">
              Uma clínica, muitos cuidados
            </p>
            <h2 className="font-display text-4xl leading-tight mb-4">
              O tempo que você dedica a si mesmo começa aqui.
            </h2>
            <p className="text-cream/70 text-sm leading-relaxed">
              Agendamentos, profissionais e memória do cuidado em um só lugar —
              com o respeito que a saúde merece.
            </p>
          </div>
          <p className="text-xs text-cream/40">
            © {new Date().getFullYear()} Espaço Wendler
          </p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-cream">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
