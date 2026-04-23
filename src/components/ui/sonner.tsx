"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CheckCircle,
  CircleNotch,
  Info,
  Warning,
  WarningOctagon,
} from "@phosphor-icons/react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CheckCircle className="size-4 text-emerald-500" weight="fill" />,
        info: <Info className="size-4 text-blue-500" weight="fill" />,
        warning: <Warning className="size-4 text-amber-500" weight="fill" />,
        error: <WarningOctagon className="size-4 text-red-500" weight="fill" />,
        loading: <CircleNotch className="size-4 animate-spin text-neutral-500" />,
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#2A2420",
          "--normal-border": "rgba(42,36,32,0.12)",
          "--border-radius": "10px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
