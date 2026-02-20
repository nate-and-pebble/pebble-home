"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";

export function ConditionalNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return <Nav />;
}
