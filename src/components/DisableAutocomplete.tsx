"use client";

import { useEffect } from "react";

/**
 * Desativa o preenchimento automático do navegador em todos os campos do sistema.
 * Observa o DOM via MutationObserver para cobrir campos adicionados dinamicamente.
 */
export function DisableAutocomplete() {
  useEffect(() => {
    function applyToNode(node: Node) {
      if (!(node instanceof HTMLElement)) return;
      const tags = node.tagName === "INPUT" || node.tagName === "SELECT" || node.tagName === "TEXTAREA"
        ? [node as HTMLElement]
        : Array.from(node.querySelectorAll<HTMLElement>("input, select, textarea"));

      tags.forEach(el => {
        // "nope" é mais eficaz que "off" para o Chrome bloquear o preenchimento de credenciais
        el.setAttribute("autocomplete", "nope");
        el.setAttribute("data-form-type", "other");
      });
    }

    // Aplica nos campos já presentes
    applyToNode(document.body);

    // Observa campos adicionados dinamicamente
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        m.addedNodes.forEach(applyToNode);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
