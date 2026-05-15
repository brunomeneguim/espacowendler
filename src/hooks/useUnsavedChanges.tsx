"use client";

import { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Save, LogOut, Pencil } from "lucide-react";
import { useToast } from "@/components/Toaster";

/**
 * Guard contra saída com alterações não salvas.
 *
 * Uso:
 *   const formRef = useRef<HTMLFormElement>(null);
 *   const { markDirty, resetDirty, guardedNavigate, UnsavedDialog } = useUnsavedChanges(formRef);
 *
 *   <form ref={formRef} onChange={markDirty} ...>
 *     ...
 *     <button onClick={() => guardedNavigate("/lista")}>Cancelar</button>
 *   </form>
 *   {UnsavedDialog}
 *
 * O diálogo usa o elemento nativo <dialog> com showModal(), que renderiza no
 * "top layer" do navegador — acima de qualquer z-index, compositing layer ou
 * backdrop-filter. Isso evita o bug do Chrome onde backdrop-filter impede
 * cliques em elementos irmãos com z-index maior.
 */
export function useUnsavedChanges(formRef: RefObject<HTMLFormElement>) {
  const router    = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { showToast } = useToast();

  const [isDirty,     setIsDirty]     = useState(false);
  const [showDialog,  setShowDialog]  = useState(false);
  const [pendingHref, setPendingHref] = useState<string>("");

  // Ref com os valores mais recentes — evita stale closures no listener global
  const stateRef = useRef({ isDirty, showDialog });
  stateRef.current = { isDirty, showDialog };

  // Sincroniza o estado React com o elemento nativo <dialog>
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (showDialog) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [showDialog]);

  // Avisa o navegador ao tentar fechar/recarregar a aba
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /**
   * Intercepta cliques em <a href> internos (sidebar, breadcrumbs, links em geral).
   * Registrado UMA VEZ (deps vazias) — usa stateRef para ler valores sempre frescos.
   */
  useEffect(() => {
    function handleLinkClick(e: MouseEvent) {
      const { isDirty, showDialog } = stateRef.current;

      // Só atua quando o form está sujo e o diálogo não está aberto
      if (!isDirty || showDialog) return;

      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";

      // Ignora: âncoras internas, links externos, mailto, tel
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) return;

      // É um link interno do Next.js — bloqueia e mostra o diálogo
      e.preventDefault();
      e.stopImmediatePropagation();
      setPendingHref(href);
      setShowDialog(true);
    }

    // Fase de captura: roda antes do onClick do <Link> do Next.js
    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markDirty  = useCallback(() => setIsDirty(true),  []);
  const resetDirty = useCallback(() => setIsDirty(false), []);

  /** Navega para `href`; se houver alterações não salvas, abre o diálogo primeiro. */
  const guardedNavigate = useCallback(
    (href: string) => {
      if (!stateRef.current.isDirty) { router.push(href); return; }
      setPendingHref(href);
      setShowDialog(true);
    },
    [router],
  );

  /**
   * Salvar: valida o form antes de fechar o diálogo.
   * Se inválido, fecha o diálogo e mostra toast na parte inferior da tela
   * (o diálogo é top-layer, toast não pode aparecer acima dele enquanto aberto).
   */
  const handleSave = useCallback(() => {
    const form = formRef.current;
    if (form && !form.checkValidity()) {
      // Fecha diálogo primeiro para que o toast fique visível
      setShowDialog(false);
      showToast("Existem campos obrigatórios não preenchidos. Corrija o formulário antes de salvar.");
      return;
    }
    setShowDialog(false);
    setTimeout(() => form?.requestSubmit(), 0);
  }, [formRef, showToast]);

  /** Sair sem salvar: navega imediatamente. */
  const handleDiscard = useCallback(() => {
    setIsDirty(false);
    setShowDialog(false);
    router.push(pendingHref);
  }, [pendingHref, router]);

  /** Continuar editando: fecha o diálogo e permanece na página. */
  const handleStay = useCallback(() => {
    setShowDialog(false);
  }, []);

  /**
   * Clique no ::backdrop (fora da caixa branca) → fecha como "Continuar editando".
   * O evento do ::backdrop chega no elemento <dialog> com coordenadas
   * fora do bounding rect da caixa, portanto basta verificar o rect.
   */
  const handleDialogClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom
    ) {
      handleStay();
    }
  }, [handleStay]);

  const UnsavedDialog = (
    <dialog
      ref={dialogRef}
      onClose={() => setShowDialog(false)}
      onClick={handleDialogClick}
      className="unsaved-guard"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-display text-base text-forest">Alterações não salvas</h3>
          <p className="text-sm text-forest-500 mt-1">
            Você tem alterações não salvas. Deseja salvá-las antes de sair?
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Sim, salvar alterações
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          className="w-full px-4 py-2 text-sm font-medium text-rust rounded-xl border border-rust/30 hover:bg-rust/5 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sair sem salvar
        </button>
        <button
          type="button"
          onClick={handleStay}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Pencil className="w-4 h-4" />
          Continuar editando
        </button>
      </div>
    </dialog>
  );

  return { isDirty, markDirty, resetDirty, guardedNavigate, UnsavedDialog };
}
