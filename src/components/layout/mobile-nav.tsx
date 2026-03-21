"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  GanttChart,
  CalendarDays,
  Truck,
  Package,
  DollarSign,
  Settings,
  ClipboardList,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lavorazioni", label: "Lavorazioni", icon: Layers },
  { href: "/gantt", label: "Gantt", icon: GanttChart },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/fornitori", label: "Fornitori", icon: Truck },
  { href: "/materiali", label: "Materiali", icon: Package },
  { href: "/trasporti", label: "Trasporti", icon: Truck },
  { href: "/presenze", label: "Presenze", icon: ClipboardList },
  { href: "/costi", label: "Costi", icon: DollarSign },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e7] z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-[#1d1d1f]" : "text-[#86868b]"
              }`}
            >
              <item.icon size={20} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
