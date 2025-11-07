"use client";

import * as React from "react";

export function Alert({ variant = "info", children }: { variant?: "info" | "warning" | "error" | "success"; children: React.ReactNode }) {
  const base = "rounded-md border px-3 py-2 text-sm";
  const styles: Record<string, string> = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
    error: "bg-red-50 border-red-200 text-red-900",
    success: "bg-green-50 border-green-200 text-green-900",
  };
  return <div className={`${base} ${styles[variant]}`}>{children}</div>;
}
