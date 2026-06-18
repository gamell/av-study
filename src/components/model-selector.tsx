"use client";

import { Cpu } from "lucide-react";
import type { ModelOption } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  models: readonly ModelOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Compact model picker shown next to every AI action. The selected model is
 * sent with the request and persisted per feature by the caller.
 */
export function ModelSelector({
  models,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel = "Model",
}: ModelSelectorProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only sm:not-sr-only">Model</span>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-9 min-h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}
          </option>
        ))}
      </select>
    </label>
  );
}
