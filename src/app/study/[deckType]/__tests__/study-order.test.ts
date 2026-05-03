import { expect, test } from "bun:test";
import { orderStudyCards } from "../study-order";

const cards = [
  { id: 1, nextReviewAt: "2026-05-02T10:00:00.000Z" },
  { id: 2, nextReviewAt: "2026-05-02T10:01:00.000Z" },
  { id: 3, nextReviewAt: "2026-05-02T10:02:00.000Z" },
  { id: 4, nextReviewAt: "2026-05-02T10:03:00.000Z" },
];

test("regular mode keeps the due-card order unchanged", () => {
  const ordered = orderStudyCards(cards, "regular");
  expect(ordered.map((card) => card.id)).toEqual([1, 2, 3, 4]);
});

test("randomized mode shuffles without mutating or losing cards", () => {
  const ordered = orderStudyCards(cards, "randomized", () => 0);

  expect(ordered.map((card) => card.id)).toEqual([2, 3, 4, 1]);
  expect(cards.map((card) => card.id)).toEqual([1, 2, 3, 4]);
  expect([...ordered].sort((a, b) => a.id - b.id).map((card) => card.id)).toEqual([
    1,
    2,
    3,
    4,
  ]);
});
