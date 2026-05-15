"use client";

import { AlertCircle, X } from "lucide-react";

/**
 * Mensagem de erro inline (formulários, modais, cards).
 * Segue o mesmo padrão visual do ErrorItem (toast de erro).
 *
 * Uso:
 *   <ErrorBanner message={erro} />
 *   <ErrorBanner message={erro} onDismiss={() => setErro(null)} />
 *
 * Retorna null automaticamente quando message é falsy.
 */
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null | undefined;
  onDismiss?: () => void;
}) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-3 bg-white rounded-xl border border-rust/20 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-rust/10 flex items-center justify-center shrink-0 mt-0.5">
        <AlertCircle className="w-4 h-4 text-rust" />
      </div>
      <p className="text-sm text-forest leading-snug pt-0.5 flex-1">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 rounded hover:opacity-60 transition-opacity text-forest-400 shrink-0 mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
