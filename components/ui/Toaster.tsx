"use client";

import { useEffect, useState } from "react";
import { useFems } from "@/store/fems";

export function Toaster() {
  const toast = useFems((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  const bg =
    toast.kind === "error"
      ? "bg-red-700"
      : toast.kind === "success"
        ? "bg-green-700"
        : "bg-slate-800";

  return (
    <div
      className={`fixed bottom-4 right-4 ${bg} text-white px-4 py-2.5 rounded-lg shadow-lg text-[13px] max-w-sm transition-all ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      {toast.message}
    </div>
  );
}
