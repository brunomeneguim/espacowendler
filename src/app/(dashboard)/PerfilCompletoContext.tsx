"use client";

import { createContext, useContext } from "react";

const PerfilCompletoContext = createContext(true);

export function usePerfilCompleto() {
  return useContext(PerfilCompletoContext);
}

export function PerfilCompletoProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <PerfilCompletoContext.Provider value={value}>
      {children}
    </PerfilCompletoContext.Provider>
  );
}
