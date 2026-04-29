"use client";

import { createContext, useContext, useState } from "react";

interface PrivacyContextValue {
  privacyMode: boolean;
  setPrivacyMode: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  privacyMode: false,
  setPrivacyMode: () => {},
});

export function usePrivacyMode() {
  return useContext(PrivacyContext);
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);
  return (
    <PrivacyContext.Provider value={{ privacyMode, setPrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}
