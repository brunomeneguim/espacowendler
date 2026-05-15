import type { Metadata } from "next";
import { Fraunces, Inter_Tight } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const halimun = localFont({
  src: "./fonts/Halimun.ttf",
  variable: "--font-halimun",
  display: "swap",
});

const bakerie = localFont({
  src: "./fonts/Bakerie.otf",
  variable: "--font-bakerie",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Espaço Wendler — Agenda de Atendimentos",
  description:
    "Plataforma de agendamento online para a clínica Espaço Wendler. Cuidado humano, agenda simples.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${interTight.variable} ${halimun.variable} ${bakerie.variable}`}>
      {/* Desativa autocomplete do navegador em TODO o sistema.
          Roda como script inline — antes do React hidratar — para não haver
          nenhuma janela de tempo em que o Chrome consiga capturar os campos. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  function fix(el){
    if(el.getAttribute('autocomplete')==='off') return;
    el.setAttribute('autocomplete','off');
    el.setAttribute('data-form-type','other');
  }
  function walk(root){
    if(!root || root.nodeType!==1) return;
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(root.tagName)) fix(root);
    if(root.querySelectorAll) root.querySelectorAll('input,select,textarea').forEach(fix);
  }
  walk(document.documentElement);
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      m.addedNodes.forEach(walk);
      if(m.type==='attributes' && m.target) fix(m.target);
    });
  }).observe(document.documentElement,{
    childList:true, subtree:true,
    attributes:true, attributeFilter:['autocomplete']
  });
})();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
