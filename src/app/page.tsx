"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  GraduationCap,
  FileText,
  BarChart3,
  Plane,
  ArrowRight,
} from "lucide-react";
import { getProgressSummary, type ProgressSummary } from "@/lib/data/progress";
import { useDb } from "@/components/db-provider";

export default function HomePage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const { version } = useDb();

  useEffect(() => {
    let cancelled = false;
    getProgressSummary()
      .then((data) => {
        if (!cancelled) setProgress(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [version]);

  const knowledgeTotal = progress?.totalByDeck?.knowledge || 0;
  const knowledgeMastered = progress?.masteredByDeck?.knowledge || 0;
  const knowledgeDue = progress?.dueByDeck?.knowledge || 0;

  const oralTotal = progress?.totalByDeck?.oral || 0;
  const oralMastered = progress?.masteredByDeck?.oral || 0;
  const oralDue = progress?.dueByDeck?.oral || 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Plane className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Pilot Study
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Master your Private Pilot knowledge test and checkride oral exam
            with spaced repetition flashcards.
          </p>
        </div>

        {/* Study Decks */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Knowledge Test */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Knowledge Test</CardTitle>
              </div>
              <CardDescription>
                FAA written exam prep — regulations, weather, aerodynamics,
                navigation, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {knowledgeMastered} / {knowledgeTotal} mastered
                </span>
                <Badge variant="secondary">
                  {knowledgeDue} due
                </Badge>
              </div>
              <Progress
                value={knowledgeMastered}
                max={Math.max(knowledgeTotal, 1)}
              />
              <Link href="/study/knowledge">
                <Button className="w-full mt-2">
                  Study Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Checkride Oral */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="h-5 w-5 text-primary" />
                <CardTitle>Checkride Oral</CardTitle>
              </div>
              <CardDescription>
                Scenario-based oral exam prep — think like a DPE would ask
                during your practical test.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {oralMastered} / {oralTotal} mastered
                </span>
                <Badge variant="secondary">
                  {oralDue} due
                </Badge>
              </div>
              <Progress value={oralMastered} max={Math.max(oralTotal, 1)} />
              <Link href="/study/oral">
                <Button className="w-full mt-2">
                  Study Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/review-text">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 py-5">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="font-medium">Study Texts</div>
                  <div className="text-sm text-muted-foreground">
                    Generate review texts from failed cards for Speechify
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/progress">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 py-5">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="font-medium">Progress Dashboard</div>
                  <div className="text-sm text-muted-foreground">
                    Track mastery by category and see weak areas
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
    </main>
  );
}
