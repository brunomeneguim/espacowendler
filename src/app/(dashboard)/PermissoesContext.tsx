"use client";

import { createContext, useContext } from "react";

export type PermissaoEntry = { podeVer: boolean; podeEditar: boolean };
export type PermissaoMap = Record<string, PermissaoEntry>;

interface PermissoesContextValue {
  permissoes: PermissaoMap;
  hasCustomPermissions: boolean;
  /** Verifica se o usuário pode VER uma página. Se não há custom permissions, retorna true (controle fica na role/sidebar). */
  podeVer: (pagina: string) => boolean;
  /** Verifica se o usuário pode EDITAR conteúdo de uma página. Se não há custom permissions, retorna true. */
  podeEditar: (pagina: string) => boolean;
}

const PermissoesContext = createContext<PermissoesContextValue>({
  permissoes: {},
  hasCustomPermissions: false,
  podeVer: () => true,
  podeEditar: () => true,
});

export function PermissoesProvider({
  children,
  permissoes,
}: {
  children: React.ReactNode;
  permissoes: PermissaoMap;
}) {
  const hasCustomPermissions = Object.keys(permissoes).length > 0;

  function podeVer(pagina: string): boolean {
    if (hasCustomPermissions) return permissoes[pagina]?.podeVer ?? false;
    return true;
  }

  function podeEditar(pagina: string): boolean {
    if (hasCustomPermissions) return permissoes[pagina]?.podeEditar ?? false;
    return true;
  }

  return (
    <PermissoesContext.Provider value={{ permissoes, hasCustomPermissions, podeVer, podeEditar }}>
      {children}
    </PermissoesContext.Provider>
  );
}

export function usePermissoes() {
  return useContext(PermissoesContext);
}
