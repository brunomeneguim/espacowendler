import Link from "next/link";
import { Calendar, Users, Clock, Heart, ArrowRight, Leaf } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-cream overflow-hidden">
      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-forest flex items-center justify-center">
            <Leaf className="w-5 h-5 text-cream" strokeWidth={1.5} />
          </div>
          <span className="font-display text-xl text-forest tracking-tight">
            espaço<span className="italic text-rust">wendler</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary">
            Começar agora
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Decorative blobs */}
        <div className="absolute top-20 -right-20 w-96 h-96 bg-peach/30 rounded-full blur-3xl -z-10" />
        <div className="absolute top-60 -left-20 w-80 h-80 bg-sand/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 animate-slide-up">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-forest/5 text-forest text-xs font-medium rounded-full tracking-widest uppercase mb-6">
                <span className="w-1.5 h-1.5 bg-forest rounded-full" />
                Agenda inteligente
              </span>
              <h1 className="font-display text-5xl md:text-7xl text-forest leading-[1.02] tracking-tight mb-6">
                Cuidado que começa
                <br />
                <span className="italic text-rust">antes da consulta</span>.
              </h1>
              <p className="text-lg text-forest-700 max-w-xl mb-8 leading-relaxed">
                Agende sessões com psicólogos, médicos e terapeutas da nossa
                clínica em poucos cliques. Uma plataforma feita para o tempo
                humano — o seu e o dos profissionais.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/cadastro" className="btn-primary group">
                  Fazer meu agendamento
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </Link>
                <Link href="/profissionais-publico" className="btn-ghost">
                  Conhecer profissionais
                </Link>
              </div>
            </div>

            {/* Card ilustrativo */}
            <div className="md:col-span-5 relative">
              <div className="relative bg-white rounded-3xl shadow-soft p-6 border border-sand/30 rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs text-forest-500 uppercase tracking-widest mb-1">
                      Próxima sessão
                    </p>
                    <p className="font-display text-2xl text-forest">
                      Quarta, 14h
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-peach/40 flex items-center justify-center">
                    <Calendar
                      className="w-5 h-5 text-rust"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { time: "09:00", name: "Ana Costa", tag: "Psicologia" },
                    {
                      time: "10:30",
                      name: "Carlos Mendes",
                      tag: "Cardiologia",
                    },
                    { time: "14:00", name: "Você", tag: "Nutrição", active: true },
                    { time: "15:30", name: "Marina L.", tag: "Psicologia" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        s.active
                          ? "bg-forest text-cream"
                          : "bg-cream/60 text-forest-700"
                      }`}
                    >
                      <span
                        className={`font-mono text-sm ${
                          s.active ? "text-peach" : "text-forest-500"
                        }`}
                      >
                        {s.time}
                      </span>
                      <span className="flex-1 text-sm font-medium">
                        {s.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.active
                            ? "bg-peach/30 text-peach"
                            : "bg-sand/30 text-olive"
                        }`}
                      >
                        {s.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Accent decorativo */}
              <div className="absolute -top-3 -left-3 w-16 h-16 bg-forest rounded-full -z-10" />
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-sand/40 rounded-full -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-20 bg-forest text-cream">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-peach mb-4">
              O que oferecemos
            </p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight">
              Tecnologia que some
              <br />
              <span className="italic text-peach">quando funciona bem</span>.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: "Agendamento online",
                desc: "Pacientes marcam horários 24/7 com a disponibilidade real de cada profissional.",
              },
              {
                icon: Users,
                title: "Equipe multidisciplinar",
                desc: "Psicólogos, médicos, nutricionistas e terapeutas — todos em um só lugar.",
              },
              {
                icon: Clock,
                title: "Lembretes automáticos",
                desc: "Notificações por e-mail e WhatsApp reduzem faltas e esquecimentos.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-forest-600/50 border border-forest-400/20 rounded-2xl p-6 hover:bg-forest-600/80 transition-colors"
              >
                <div className="w-12 h-12 bg-peach/20 rounded-xl flex items-center justify-center mb-5">
                  <f.icon className="w-6 h-6 text-peach" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl mb-2">{f.title}</h3>
                <p className="text-cream/70 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <Heart
            className="w-10 h-10 text-rust mx-auto mb-6"
            strokeWidth={1.2}
          />
          <h2 className="font-display text-4xl md:text-5xl text-forest leading-tight mb-6">
            Pronto para começar?
          </h2>
          <p className="text-forest-700 mb-8 text-lg">
            Crie sua conta em menos de um minuto e agende sua primeira sessão.
          </p>
          <Link href="/cadastro" className="btn-primary">
            Criar minha conta
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand/30 px-6 md:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-forest-600">
          <p>© {new Date().getFullYear()} Espaço Wendler. Feito com cuidado.</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-forest">
              Entrar
            </Link>
            <a href="#" className="hover:text-forest">
              Política de privacidade
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
