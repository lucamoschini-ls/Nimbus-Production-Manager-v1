"use client";

import { HelpCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ReactNode } from "react";

type InfoTooltipProps = {
  variant?: "info" | "warning";
  text: ReactNode;
  size?: "sm" | "md";
  className?: string;
};

export function InfoTooltip({
  variant = "info",
  text,
  size = "sm",
  className,
}: InfoTooltipProps) {
  const Icon = variant === "warning" ? AlertTriangle : HelpCircle;
  const sizePx = size === "sm" ? 14 : 16;
  const colorClass =
    variant === "warning"
      ? "text-amber-500 hover:text-amber-600"
      : "text-[#86868b] hover:text-[#1d1d1f]";

  return (
    <Tooltip>
      <TooltipTrigger
        className={`inline-flex items-center align-middle ${colorClass} ${className ?? ""}`}
        aria-label={variant === "warning" ? "Avviso" : "Informazione"}
      >
        <Icon size={sizePx} />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
