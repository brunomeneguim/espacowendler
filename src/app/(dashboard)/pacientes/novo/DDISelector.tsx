"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

export const DDI_LIST = [
  { code: "+55",  country: "Brasil",          flag: "🇧🇷" },
  { code: "+1",   country: "EUA / Canadá",    flag: "🇺🇸" },
  { code: "+351", country: "Portugal",         flag: "🇵🇹" },
  { code: "+54",  country: "Argentina",        flag: "🇦🇷" },
  { code: "+56",  country: "Chile",            flag: "🇨🇱" },
  { code: "+57",  country: "Colômbia",         flag: "🇨🇴" },
  { code: "+598", country: "Uruguai",          flag: "🇺🇾" },
  { code: "+595", country: "Paraguai",         flag: "🇵🇾" },
  { code: "+591", country: "Bolívia",          flag: "🇧🇴" },
  { code: "+52",  country: "México",           flag: "🇲🇽" },
  { code: "+34",  country: "Espanha",          flag: "🇪🇸" },
  { code: "+39",  country: "Itália",           flag: "🇮🇹" },
  { code: "+33",  country: "França",           flag: "🇫🇷" },
  { code: "+44",  country: "Reino Unido",      flag: "🇬🇧" },
  { code: "+49",  country: "Alemanha",         flag: "🇩🇪" },
  { code: "+351", country: "Portugal",         flag: "🇵🇹" },
  { code: "+81",  country: "Japão",            flag: "🇯🇵" },
  { code: "+86",  country: "China",            flag: "🇨🇳" },
  { code: "+91",  country: "Índia",            flag: "🇮🇳" },
  { code: "+27",  country: "África do Sul",    flag: "🇿🇦" },
  { code: "+61",  country: "Austrália",        flag: "🇦🇺" },
  { code: "+7",   country: "Rússia",           flag: "🇷🇺" },
  { code: "+82",  country: "Coreia do Sul",    flag: "🇰🇷" },
  { code: "+966", country: "Arábia Saudita",   flag: "🇸🇦" },
  { code: "+971", country: "Emirados",         flag: "🇦🇪" },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  name: string;
}

export function DDISelector({ value, onChange, name }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = DDI_LIST.find(d => d.code === value) ?? DDI_LIST[0];
  const filtered = DDI_LIST.filter(
    d => d.country.toLowerCase().includes(search.toLowerCase()) || d.code.includes(search)
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 self-stretch px-2 min-w-[72px] border border-sand/40 rounded-l-lg bg-white hover:bg-sand/10 transition-colors text-sm font-medium text-forest border-r-0 shrink-0"
        title={`${selected.flag} ${selected.country} (${selected.code})`}
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="hidden sm:inline text-xs text-forest-500">{selected.code}</span>
        <ChevronDown className={`w-3 h-3 text-forest-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-sand/40 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-sand/30">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-forest-400" />
              <input
                type="text"
                placeholder="Buscar país…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-sand/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest/30"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.map(d => (
              <li key={`${d.code}-${d.country}`}>
                <button
                  type="button"
                  onClick={() => { onChange(d.code); setOpen(false); setSearch(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-sand/20 transition-colors ${value === d.code ? "bg-forest/5 text-forest font-medium" : "text-forest-700"}`}
                >
                  <span className="text-base">{d.flag}</span>
                  <span className="flex-1 text-left">{d.country}</span>
                  <span className="text-forest-400">{d.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
