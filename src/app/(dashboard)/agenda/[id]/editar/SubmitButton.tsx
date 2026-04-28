"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
        : "Salvar alterações"}
    </button>
  );
}
