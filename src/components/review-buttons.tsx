"use client";

import { Button } from "@/components/ui/button";
import { QUALITY_MAP } from "@/lib/sm2";

interface ReviewButtonsProps {
  onReview: (quality: keyof typeof QUALITY_MAP) => void;
  disabled?: boolean;
}

const buttons = [
  {
    key: "again" as const,
    label: "Again",
    description: "Forgot completely",
    className: "border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10",
  },
  {
    key: "hard" as const,
    label: "Hard",
    description: "Struggled to recall",
    className: "border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10",
  },
  {
    key: "good" as const,
    label: "Good",
    description: "Recalled after thought",
    className: "border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10",
  },
  {
    key: "easy" as const,
    label: "Easy",
    description: "Instant recall",
    className: "border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10",
  },
];

export function ReviewButtons({ onReview, disabled }: ReviewButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 w-full max-w-2xl mx-auto">
      {buttons.map((btn) => (
        <Button
          key={btn.key}
          variant="outline"
          className={`flex flex-col h-auto py-3 ${btn.className}`}
          onClick={() => onReview(btn.key)}
          disabled={disabled}
        >
          <span className="font-semibold">{btn.label}</span>
          <span className="text-[10px] opacity-70">{btn.description}</span>
        </Button>
      ))}
    </div>
  );
}
