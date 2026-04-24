"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FlashcardProps {
  question: string;
  answer: string;
  categoryName: string;
  acsCode?: string | null;
  references?: string | null;
  isFlipped: boolean;
  onFlip: () => void;
}

export function Flashcard({
  question,
  answer,
  categoryName,
  acsCode,
  references,
  isFlipped,
  onFlip,
}: FlashcardProps) {
  return (
    <div className="perspective-1000 w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative w-full min-h-[320px] cursor-pointer transition-transform duration-500",
          "transform-style-3d",
          isFlipped && "[transform:rotateY(180deg)]"
        )}
        onClick={onFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onFlip();
          }
        }}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden rounded-xl border bg-card p-8 shadow-lg flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{categoryName}</Badge>
            {acsCode && (
              <Badge variant="outline" className="font-mono text-xs">
                {acsCode}
              </Badge>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-center leading-relaxed">{question}</p>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Click or press Space to reveal answer
          </p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] rounded-xl border bg-card p-8 shadow-lg flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="default">Answer</Badge>
            {acsCode && (
              <Badge variant="outline" className="font-mono text-xs">
                {acsCode}
              </Badge>
            )}
          </div>
          <div className="flex-1 flex items-center">
            <p className="text-base leading-relaxed">{answer}</p>
          </div>
          {references && (
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
              Ref: {references}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
