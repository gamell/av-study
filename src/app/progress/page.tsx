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
import { Badge } from "@/components/ui/badge";
import { StackedProgress } from "@/components/ui/stacked-progress";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";
import {
  getProgressSummary,
  type CategoryStatsDTO as CategoryStat,
  type ProgressSummary as ProgressData,
} from "@/lib/data/progress";
import { useDb } from "@/components/db-provider";

const MASTERED_CLASS = "bg-green-500";
const EASY_CLASS = "bg-blue-500";
const HARD_CLASS = "bg-orange-500";

function LegendDot({ className }: { className: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />;
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const { version } = useDb();

  useEffect(() => {
    let cancelled = false;
    getProgressSummary()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (!data) {
    return (
      <>
        <NavHeader />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <div className="text-center text-muted-foreground">Loading...</div>
        </main>
      </>
    );
  }

  const knowledgeStats = data.categoryStats.filter(
    (c) => c.deckType === "knowledge"
  );
  const oralStats = data.categoryStats.filter((c) => c.deckType === "oral");

  const weakAreas = [...data.categoryStats]
    .sort((a, b) => a.avgEaseFactor - b.avgEaseFactor)
    .slice(0, 5);

  const kTotal = data.totalByDeck.knowledge || 0;
  const kMastered = data.masteredByDeck.knowledge || 0;
  const kEasy = data.learningEasyByDeck.knowledge || 0;
  const kHard = data.learningHardByDeck.knowledge || 0;
  const kNew = kTotal - kMastered - kEasy - kHard;

  const oTotal = data.totalByDeck.oral || 0;
  const oMastered = data.masteredByDeck.oral || 0;
  const oEasy = data.learningEasyByDeck.oral || 0;
  const oHard = data.learningHardByDeck.oral || 0;
  const oNew = oTotal - oMastered - oEasy - oHard;

  return (
    <>
      <NavHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Progress Dashboard</h1>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-muted-foreground mb-6">
          <span className="flex items-center gap-1.5">
            <LegendDot className={MASTERED_CLASS} /> Mastered
          </span>
          <span className="flex items-center gap-1.5">
            <LegendDot className={EASY_CLASS} /> Learning (Easy)
          </span>
          <span className="flex items-center gap-1.5">
            <LegendDot className={HARD_CLASS} /> Learning (Hard)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-secondary border" />
            New
          </span>
        </div>

        {/* Deck Overview Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <DeckOverview
            title="Knowledge Test"
            icon={<BookOpen className="h-5 w-5 text-primary" />}
            total={kTotal}
            mastered={kMastered}
            learningEasy={kEasy}
            learningHard={kHard}
            newCards={kNew}
            due={data.dueByDeck.knowledge || 0}
          />
          <DeckOverview
            title="Checkride Oral"
            icon={<GraduationCap className="h-5 w-5 text-primary" />}
            total={oTotal}
            mastered={oMastered}
            learningEasy={oEasy}
            learningHard={oHard}
            newCards={oNew}
            due={data.dueByDeck.oral || 0}
          />
        </div>

        {/* Weak Areas */}
        {weakAreas.length > 0 && (
          <Card className="mb-10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">
                  Areas Needing Attention
                </CardTitle>
              </div>
              <CardDescription>
                Categories with the lowest average ease factor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weakAreas.map((area) => (
                  <div key={area.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {area.categoryName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {area.deckType === "knowledge" ? "Written" : "Oral"}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {area.mastered} mastered · {area.learningEasy + area.learningHard} learning
                      </span>
                    </div>
                    <StackedProgress
                      max={area.totalCards}
                      segments={[
                        { value: area.mastered, className: MASTERED_CLASS, label: "Mastered" },
                        { value: area.learningEasy, className: EASY_CLASS, label: "Learning Easy" },
                        { value: area.learningHard, className: HARD_CLASS, label: "Learning Hard" },
                      ]}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Knowledge Test Breakdown */}
        <DeckBreakdown
          title="Knowledge Test"
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          stats={knowledgeStats}
        />

        {/* Checkride Oral Breakdown */}
        <DeckBreakdown
          title="Checkride Oral"
          icon={<GraduationCap className="h-5 w-5 text-primary" />}
          stats={oralStats}
        />

        {/* Recent Sessions */}
        {data.recentSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {session.deckType === "knowledge" ? "Written" : "Oral"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(session.startedAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">
                        {session.cardsCorrect}/{session.cardsReviewed}
                      </span>{" "}
                      <span className="text-muted-foreground">correct</span>
                      {session.cardsReviewed > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          (
                          {Math.round(
                            (session.cardsCorrect / session.cardsReviewed) *
                              100
                          )}
                          %)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}

function DeckOverview({
  title,
  icon,
  total,
  mastered,
  learningEasy,
  learningHard,
  newCards,
  due,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  mastered: number;
  learningEasy: number;
  learningHard: number;
  newCards: number;
  due: number;
}) {
  const learning = learningEasy + learningHard;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            {due} due
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StackedProgress
          max={total}
          segments={[
            { value: mastered, className: MASTERED_CLASS, label: "Mastered" },
            { value: learningEasy, className: EASY_CLASS, label: "Learning Easy" },
            { value: learningHard, className: HARD_CLASS, label: "Learning Hard" },
          ]}
        />
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xl font-bold text-green-500">{mastered}</div>
            <div className="text-xs text-muted-foreground">Mastered</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-500">{learningEasy}</div>
            <div className="text-xs text-muted-foreground">Easy</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-500">{learningHard}</div>
            <div className="text-xs text-muted-foreground">Hard</div>
          </div>
          <div>
            <div className="text-xl font-bold">{newCards}</div>
            <div className="text-xs text-muted-foreground">New</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          {learning} of {total} cards in active learning · {mastered} mastered
        </div>
      </CardContent>
    </Card>
  );
}

function DeckBreakdown({
  title,
  icon,
  stats,
}: {
  title: string;
  icon: React.ReactNode;
  stats: CategoryStat[];
}) {
  if (stats.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title} — By Category</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => {
            const learning = stat.learningEasy + stat.learningHard;
            return (
              <div key={stat.categoryId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stat.categoryName}</span>
                  <span className="text-muted-foreground text-xs">
                    {stat.mastered} mastered · {learning} learning · {stat.totalCards} total
                  </span>
                </div>
                <StackedProgress
                  max={stat.totalCards}
                  segments={[
                    { value: stat.mastered, className: MASTERED_CLASS, label: "Mastered" },
                    { value: stat.learningEasy, className: EASY_CLASS, label: "Learning Easy" },
                    { value: stat.learningHard, className: HARD_CLASS, label: "Learning Hard" },
                  ]}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
