export type StudyMode = "regular" | "randomized";

export function orderStudyCards<T>(
  cards: T[],
  mode: StudyMode,
  random: () => number = Math.random
): T[] {
  const ordered = [...cards];
  if (mode === "regular") return ordered;

  for (
    let currentIndex = ordered.length - 1;
    currentIndex > 0;
    currentIndex -= 1
  ) {
    const swapIndex = Math.floor(random() * (currentIndex + 1));
    [ordered[currentIndex], ordered[swapIndex]] = [
      ordered[swapIndex],
      ordered[currentIndex],
    ];
  }

  return ordered;
}
