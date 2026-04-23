import type { ReactNode } from "react";
import { LeftSidebar } from "@/components/app-shell/left-sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <LeftSidebar>{children}</LeftSidebar>;
}
