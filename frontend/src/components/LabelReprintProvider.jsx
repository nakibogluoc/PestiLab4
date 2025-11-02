import React from "react";

const Ctx = React.createContext(null);

export function LabelReprintProvider({ children }) {
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState(null); // in-memory only (no save)

  const openWith = React.useCallback((payload) => {
    setData(payload || null);
    setOpen(!!payload);
  }, []);

  const close = React.useCallback(() => setOpen(false), []);

  const value = React.useMemo(
    () => ({ open, data, openWith, close }),
    [open, data, openWith, close]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLabelReprint() {
  const ctx = React.useContext(Ctx);
  if (!ctx)
    throw new Error("useLabelReprint must be used inside <LabelReprintProvider>");
  return ctx;
}
