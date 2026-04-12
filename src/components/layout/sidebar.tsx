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
  Sun,
  Search,
} from "lucide-react";

const navItems = [
  { href: "/oggi", label: "Oggi", icon: Sun },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lavorazioni", label: "Lavorazioni", icon: Layers },
  { href: "/gantt", label: "Gantt", icon: GanttChart },
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/fornitori", label: "Fornitori", icon: Truck },
  { href: "/materiali", label: "Materiali", icon: Package },
  { href: "/materiali-nuovo", label: "Materiali (nuovo)", icon: Package },
  { href: "/trasporti", label: "Trasporti", icon: Truck },
  { href: "/presenze", label: "Presenze", icon: ClipboardList },
  { href: "/costi", label: "Costi", icon: DollarSign },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] flex-col bg-white border-r border-[#e5e5e7] z-30">
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-[#1d1d1f] tracking-tight">
          Nimbus 2026
        </h1>
      </div>
      <div className="px-3 mb-2">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[#86868b] bg-[#f5f5f7] hover:bg-[#ebebed] transition-colors"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Cerca...</span>
          <kbd className="text-[9px] border border-[#e5e5e7] rounded px-1 py-0.5">&#8984;K</kbd>
        </button>
      </div>
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                isActive
                  ? "bg-[#f5f5f7] text-[#1d1d1f]"
                  : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]/50"
              }`}
            >
              <item.icon size={18} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
