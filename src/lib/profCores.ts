// Paleta de cores dos profissionais — usada no calendário e nos formulários

export const PROF_CORES = [
  { id: "blue",      label: "Azul",           border: "border-l-blue-500",     bg: "bg-blue-500",     hex: "#3b82f6" },
  { id: "indigo",    label: "Índigo",          border: "border-l-indigo-500",   bg: "bg-indigo-500",   hex: "#6366f1" },
  { id: "violet",    label: "Roxo",            border: "border-l-violet-500",   bg: "bg-violet-500",   hex: "#8b5cf6" },
  { id: "purple",    label: "Púrpura",         border: "border-l-purple-500",   bg: "bg-purple-500",   hex: "#a855f7" },
  { id: "fuchsia",   label: "Fúcsia",          border: "border-l-fuchsia-500",  bg: "bg-fuchsia-500",  hex: "#d946ef" },
  { id: "pink",      label: "Rosa claro",      border: "border-l-pink-500",     bg: "bg-pink-500",     hex: "#ec4899" },
  { id: "rose",      label: "Rosa",            border: "border-l-rose-500",     bg: "bg-rose-500",     hex: "#f43f5e" },
  { id: "red",       label: "Vermelho",        border: "border-l-red-500",      bg: "bg-red-500",      hex: "#ef4444" },
  { id: "orange",    label: "Laranja",         border: "border-l-orange-500",   bg: "bg-orange-500",   hex: "#f97316" },
  { id: "amber",     label: "Âmbar",           border: "border-l-amber-500",    bg: "bg-amber-500",    hex: "#f59e0b" },
  { id: "yellow",    label: "Amarelo",         border: "border-l-yellow-500",   bg: "bg-yellow-500",   hex: "#eab308" },
  { id: "lime",      label: "Lima",            border: "border-l-lime-600",     bg: "bg-lime-600",     hex: "#65a30d" },
  { id: "green",     label: "Verde",           border: "border-l-green-600",    bg: "bg-green-600",    hex: "#16a34a" },
  { id: "emerald",   label: "Esmeralda",       border: "border-l-emerald-500",  bg: "bg-emerald-500",  hex: "#10b981" },
  { id: "teal",      label: "Verde-água",      border: "border-l-teal-500",     bg: "bg-teal-500",     hex: "#14b8a6" },
  { id: "cyan",      label: "Ciano",           border: "border-l-cyan-600",     bg: "bg-cyan-600",     hex: "#0891b2" },
  { id: "sky",       label: "Céu",             border: "border-l-sky-500",      bg: "bg-sky-500",      hex: "#0ea5e9" },
  { id: "slate",     label: "Ardósia",         border: "border-l-slate-500",    bg: "bg-slate-500",    hex: "#64748b" },
  { id: "stone",     label: "Pedra",           border: "border-l-stone-500",    bg: "bg-stone-500",    hex: "#78716c" },
  { id: "zinc",      label: "Zinco",           border: "border-l-zinc-500",     bg: "bg-zinc-500",     hex: "#71717a" },
] as const;

export type ProfCorId = typeof PROF_CORES[number]["id"];

export function getCorById(id: string | null | undefined) {
  return PROF_CORES.find(c => c.id === id) ?? PROF_CORES[0];
}
