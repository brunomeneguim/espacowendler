"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Toast de erro: cartão branco com ícone vermelho ───────────────
function ErrorItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(dismiss, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  return (
    <div
      className={`flex items-start gap-3 bg-white rounded-2xl shadow-2xl border border-rust/20 px-4 py-3.5 max-w-sm w-full transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="w-8 h-8 rounded-full bg-rust/10 flex items-center justify-center shrink-0 mt-0.5">
        <AlertCircle className="w-4 h-4 text-rust" />
      </div>
      <p className="text-sm font-medium text-forest flex-1 leading-snug pt-1">{toast.message}</p>
      <button
        onClick={dismiss}
        className="p-0.5 rounded hover:opacity-60 transition-opacity text-forest-400 shrink-0 mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Toast de sucesso / info: banner colorido ──────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onRemove]);

  const cfg = {
    success: { bg: "bg-teal-600", border: "border-teal-500",  icon: <CheckCircle2 className="w-4 h-4 shrink-0" />, text: "text-white" },
    info:    { bg: "bg-forest",   border: "border-forest/80", icon: <Info         className="w-4 h-4 shrink-0" />, text: "text-cream" },
    error:   { bg: "bg-rust",     border: "border-rust/80",   icon: <AlertCircle  className="w-4 h-4 shrink-0" />, text: "text-cream" },
  }[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border ${cfg.bg} ${cfg.border} ${cfg.text} max-w-sm w-full transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      {cfg.icon}
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }}
        className="p-0.5 rounded hover:opacity-70 transition-opacity shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Todos os toasts: parte inferior central da tela */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            {t.type === "error"
              ? <ErrorItem toast={t} onRemove={removeToast} />
              : <ToastItem toast={t} onRemove={removeToast} />
            }
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
