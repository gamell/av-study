"use client";

import { useEffect, useState } from "react";
import { NavHeader } from "@/components/nav-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Wand2,
  Download,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getAllCards } from "@/lib/data/cards";
import { listStudyTexts } from "@/lib/data/study-texts";
import { syncEngine } from "@/lib/data/sync";
import { useDb } from "@/components/db-provider";

interface FailedCard {
  id: number;
  question: string;
  answer: string;
  categoryName: string;
  easeFactor: number;
}

interface SavedText {
  id: number;
  title: string;
  content: string;
  provider: string;
  model: string;
  createdAt: string;
}

export default function ReviewTextPage() {
  const [failedCards, setFailedCards] = useState<FailedCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [savedTexts, setSavedTexts] = useState<SavedText[]>([]);
  const [expandedTextId, setExpandedTextId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const { version } = useDb();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [allCards, texts] = await Promise.all([
        getAllCards("knowledge"),
        listStudyTexts(),
      ]);
      if (cancelled) return;
      const weak = allCards
        .filter((c) => c.easeFactor < 2.5)
        .sort((a, b) => a.easeFactor - b.easeFactor)
        .map((c) => ({
          id: c.id,
          question: c.question,
          answer: c.answer,
          categoryName: c.categoryName,
          easeFactor: c.easeFactor,
        }));
      setFailedCards(weak);
      setSavedTexts(texts);
    })();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const toggleCard = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateAuto = async () => {
    if (!navigator.onLine) {
      alert("Generating study texts requires an internet connection.");
      return;
    }
    setIsGenerating(true);
    setGeneratedText(null);
    try {
      const res = await fetch("/api/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setGeneratedText(data.content);
        setSavedTexts((prev) => [
          ...prev,
          {
            id: data.id,
            title: data.title,
            content: data.content,
            provider: data.provider,
            model: data.model,
            createdAt: new Date().toISOString(),
          },
        ]);
        void syncEngine.syncNow();
      }
    } catch {
      alert("Failed to generate text. Check your LLM API key configuration.");
    }
    setIsGenerating(false);
  };

  const generateManual = async () => {
    if (selectedIds.size === 0) return;
    if (!navigator.onLine) {
      alert("Generating study texts requires an internet connection.");
      return;
    }
    setIsGenerating(true);
    setGeneratedText(null);
    try {
      const res = await fetch("/api/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          cardIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setGeneratedText(data.content);
        setSavedTexts((prev) => [
          ...prev,
          {
            id: data.id,
            title: data.title,
            content: data.content,
            provider: data.provider,
            model: data.model,
            createdAt: new Date().toISOString(),
          },
        ]);
        void syncEngine.syncNow();
      }
    } catch {
      alert("Failed to generate text. Check your LLM API key configuration.");
    }
    setIsGenerating(false);
  };

  const downloadText = (content: string, title: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <NavHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Study Texts</h1>
        </div>

        <p className="text-muted-foreground mb-8 max-w-2xl">
          Generate review texts from your weakest cards. The AI creates flowing,
          conversational explanations with mnemonics — perfect for listening on
          Speechify while running.
        </p>

        {/* Generate Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Auto Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Auto-Select</CardTitle>
              <CardDescription>
                Let the app pick your weakest cards automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={generateAuto}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate from Weakest Cards
              </Button>
            </CardContent>
          </Card>

          {/* Manual Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual Select</CardTitle>
              <CardDescription>
                Choose specific cards to include ({selectedIds.size} selected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={generateManual}
                disabled={isGenerating || selectedIds.size === 0}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate from Selected ({selectedIds.size})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Card Selection */}
        {failedCards.length > 0 && (
          <Card className="mb-10">
            <CardHeader>
              <CardTitle className="text-lg">Cards Needing Review</CardTitle>
              <CardDescription>
                Sorted by difficulty — click to select for manual generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {failedCards.map((card) => (
                  <div
                    key={card.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(card.id)
                        ? "bg-primary/10 border-primary/30"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => toggleCard(card.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(card.id)}
                      onChange={() => toggleCard(card.id)}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {card.question}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {card.categoryName}
                        </Badge>
                        <Badge
                          variant="destructive"
                          className="text-xs"
                        >
                          EF: {card.easeFactor.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Text Preview */}
        {generatedText && (
          <Card className="mb-10 border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Generated Study Text</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(generatedText)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadText(
                        generatedText,
                        `study-review-${new Date().toISOString().slice(0, 10)}`
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download .txt
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto">
                {generatedText}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Texts */}
        {savedTexts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Saved Study Texts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {savedTexts.map((text) => (
                <div key={text.id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                    onClick={() =>
                      setExpandedTextId(
                        expandedTextId === text.id ? null : text.id
                      )
                    }
                  >
                    <div>
                      <div className="font-medium text-sm">{text.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {text.provider}/{text.model} —{" "}
                        {new Date(text.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadText(text.content, text.title);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {expandedTextId === text.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {expandedTextId === text.id && (
                    <div className="px-4 pb-4 border-t">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-64 overflow-y-auto mt-3">
                        {text.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
