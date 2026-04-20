// Paleta de cores dos profissionais — usada no calendário e nos formulários

export const PROF_CORES = [
  { id: "blue",    label: "Azul",        border: "border-l-blue-500",    bg: "bg-blue-500",    hex: "#3b82f6" },
  { id: "violet",  label: "Roxo",        border: "border-l-violet-500",  bg: "bg-violet-500",  hex: "#8b5cf6" },
  { id: "teal",    label: "Verde-água",  border: "border-l-teal-500",    bg: "bg-teal-500",    hex: "#14b8a6" },
  { id: "rose",    label: "Rosa",        border: "border-l-rose-500",    bg: "bg-rose-500",    hex: "#f43f5e" },
  { id: "amber",   label: "Âmbar",      border: "border-l-amber-500",   bg: "bg-amber-500",   hex: "#f59e0b" },
  { id: "cyan",    label: "Ciano",       border: "border-l-cyan-600",    bg: "bg-cyan-600",    hex: "#0891b2" },
  { id: "fuchsia", label: "Fúcsia",     border: "border-l-fuchsia-500", bg: "bg-fuchsia-500", hex: "#d946ef" },
  { id: "lime",    label: "Lima",        border: "border-l-lime-600",    bg: "bg-lime-600",    hex: "#65a30d" },
  { id: "orange",  label: "Laranja",    border: "border-l-orange-500",  bg: "bg-orange-500",  hex: "#f97316" },
  { id: "indigo",  label: "Índigo",     border: "border-l-indigo-500",  bg: "bg-indigo-500",  hex: "#6366f1" },
] as const;

export type ProfCorId = typeof PROF_CORES[number]["id"];

export function getCorById(id: string | null | undefined) {
  return PROF_CORES.find(c => c.id === id) ?? PROF_CORES[0];
}
