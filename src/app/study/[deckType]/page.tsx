"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Flashcard } from "@/components/flashcard";
import { ReviewButtons } from "@/components/review-buttons";
import { CardActions } from "@/components/card-actions";
import { NavHeader } from "@/components/nav-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QUALITY_MAP } from "@/lib/sm2";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  BookOpen,
} from "lucide-react";
import { getDueCards, deleteCard } from "@/lib/data/cards";
import { recordReview } from "@/lib/data/reviews";
import { createSession, updateSession } from "@/lib/data/sessions";
import { useDb } from "@/components/db-provider";
import type { DeckType } from "@/lib/data/types";
import { shouldWaitForInitialStudyLoad } from "./study-readiness";
import { orderStudyCards, type StudyMode } from "./study-order";

interface StudyCard {
  id: number;
  question: string;
  answer: string;
  acsCode: string | null;
  references: string | null;
  categoryName: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
}

const STUDY_MODES: StudyMode[] = ["regular", "randomized"];

interface StudyModeSelectorProps {
  className: string;
  studyMode: StudyMode;
  onStudyModeChange: (mode: StudyMode) => Promise<void>;
}

function StudyModeSelector({
  className,
  studyMode,
  onStudyModeChange,
}: StudyModeSelectorProps) {
  return (
    <div className={className}>
      <span className="text-xs text-muted-foreground">Mode</span>
      {STUDY_MODES.map((mode) => (
        <Button
          key={mode}
          type="button"
          variant={studyMode === mode ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs capitalize"
          onClick={() => void onStudyModeChange(mode)}
        >
          {mode}
        </Button>
      ))}
    </div>
  );
}

export default function StudyPage({
  params,
}: {
  params: Promise<{ deckType: string }>;
}) {
  const { deckType } = use(params);
  const router = useRouter();
  const { state: syncState } = useDb();
  const [dueCards, setDueCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [cardsCorrect, setCardsCorrect] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>("regular");

  const deckLabel = deckType === "knowledge" ? "Knowledge Test" : "Checkride Oral";

  const loadCards = useCallback(async (mode: StudyMode = studyMode) => {
    setIsLoading(true);
    const data = await getDueCards(deckType as DeckType);
    setDueCards(orderStudyCards(data, mode));
    setCurrentIndex(0);
    setCardsReviewed(0);
    setCardsCorrect(0);
    setIsFlipped(false);
    setIsComplete(false);

    if (data.length > 0) {
      const session = await createSession(deckType as DeckType);
      setSessionId(session.id);
    }

    setIsLoading(false);
    setLoadedOnce(true);
  }, [deckType, studyMode]);

  /**
   * On first mount, wait until we've seen at least one persisted snapshot. A
   * rehydrated snapshot can be used immediately, even while a network pull is
   * still trying in the background during offline boot.
   */
  useEffect(() => {
    if (loadedOnce) return;
    if (
      shouldWaitForInitialStudyLoad({
        loadedOnce,
        lastSyncAt: syncState.lastSyncAt,
        syncStatus: syncState.status,
      })
    ) return;
    loadCards();
  }, [loadCards, loadedOnce, syncState.lastSyncAt, syncState.status]);

  const handleStudyModeChange = async (mode: StudyMode) => {
    if (mode === studyMode) return;
    setStudyMode(mode);
    if (loadedOnce) {
      await loadCards(mode);
    }
  };

  const handleDuplicate = async () => {
    const card = dueCards[currentIndex];
    if (!card) return;

    await deleteCard(card.id);

    const updated = [...dueCards];
    updated.splice(currentIndex, 1);
    setDueCards(updated);

    if (updated.length === 0) {
      setIsComplete(true);
    } else if (currentIndex >= updated.length) {
      setCurrentIndex(updated.length - 1);
    }
    setIsFlipped(false);
  };

  const handleReview = async (quality: keyof typeof QUALITY_MAP) => {
    if (!dueCards[currentIndex] || isReviewing) return;
    setIsReviewing(true);

    const card = dueCards[currentIndex];
    const qualityScore = QUALITY_MAP[quality];
    const correct = qualityScore >= 3;

    await recordReview(card.id, qualityScore);

    const newReviewed = cardsReviewed + 1;
    const newCorrect = cardsCorrect + (correct ? 1 : 0);
    setCardsReviewed(newReviewed);
    setCardsCorrect(newCorrect);

    if (sessionId != null) {
      await updateSession(sessionId, {
        cardsReviewed: newReviewed,
        cardsCorrect: newCorrect,
      });
    }

    if (currentIndex + 1 >= dueCards.length) {
      if (sessionId != null) {
        await updateSession(sessionId, { ended: true });
      }
      setIsComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
    setIsReviewing(false);
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isComplete || isLoading || !dueCards.length) return;

      if (!isFlipped) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setIsFlipped(true);
        }
        return;
      }

      switch (e.key) {
        case "1":
          handleReview("again");
          break;
        case "2":
          handleReview("hard");
          break;
        case "3":
          handleReview("good");
          break;
        case "4":
          handleReview("easy");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (isLoading) {
    return (
      <>
        <NavHeader />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-muted-foreground">Loading cards...</div>
          </div>
        </main>
      </>
    );
  }

  if (dueCards.length === 0) {
    return (
      <>
        <NavHeader />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">All caught up!</h2>
            <p className="text-muted-foreground text-center max-w-md">
              No {deckLabel} cards are due for review right now. Come back later
              or start a new study session when cards become due.
            </p>
            <Button onClick={() => router.push("/")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (isComplete) {
    const accuracy =
      cardsReviewed > 0
        ? Math.round((cardsCorrect / cardsReviewed) * 100)
        : 0;

    return (
      <>
        <NavHeader />
        <main className="mx-auto max-w-5xl px-4 py-12">
          <div className="flex flex-col items-center gap-8">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Session Complete!</h2>

            <div className="grid grid-cols-3 gap-6 w-full max-w-lg">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold">{cardsReviewed}</div>
                  <div className="text-sm text-muted-foreground">Reviewed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {cardsCorrect}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold">{accuracy}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => void loadCards()} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Study Again
              </Button>
              <Button onClick={() => router.push("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </main>
      </>
    );
  }

  const currentCard = dueCards[currentIndex];

  return (
    <>
      <NavHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Session header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {currentIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setCurrentIndex((i) => i - 1);
                    setIsFlipped(false);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">{deckLabel}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <StudyModeSelector
                className="hidden items-center gap-1 sm:flex"
                studyMode={studyMode}
                onStudyModeChange={handleStudyModeChange}
              />
              <Badge variant="secondary" className="font-mono">
                {currentIndex + 1} / {dueCards.length}
              </Badge>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{cardsCorrect}</span>
                <XCircle className="h-4 w-4 text-red-500 ml-1" />
                <span>{cardsReviewed - cardsCorrect}</span>
              </div>
            </div>
          </div>
          <StudyModeSelector
            className="mb-3 flex items-center gap-2 sm:hidden"
            studyMode={studyMode}
            onStudyModeChange={handleStudyModeChange}
          />
          <Progress value={currentIndex + 1} max={dueCards.length} />
        </div>

        {/* Flashcard */}
        <div className="mb-8">
          <Flashcard
            question={currentCard.question}
            answer={currentCard.answer}
            categoryName={currentCard.categoryName}
            acsCode={currentCard.acsCode}
            references={currentCard.references}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped(!isFlipped)}
          />
        </div>

        {/* Review buttons (only shown when card is flipped) */}
        {isFlipped && (
          <div className="space-y-4">
            <ReviewButtons onReview={handleReview} disabled={isReviewing} />
            <p className="text-xs text-muted-foreground text-center">
              Keyboard: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
            </p>
            <CardActions
              cardId={currentCard.id}
              question={currentCard.question}
              answer={currentCard.answer}
              acsCode={currentCard.acsCode}
              references={currentCard.references}
              onDuplicate={handleDuplicate}
            />
          </div>
        )}
      </main>
    </>
  );
}
