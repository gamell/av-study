"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Database,
  Search,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Save,
  X,
  StickyNote,
  MessageSquare,
  ImageIcon,
  Wand2,
  Loader2,
  Check,
  Send,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  searchCards,
  type DatabaseCardDTO as SearchCard,
} from "@/lib/data/search";
import { updateCard, deleteCard } from "@/lib/data/cards";
import { addNote, listNotes } from "@/lib/data/notes";
import { syncEngine } from "@/lib/data/sync";
import { useDb } from "@/components/db-provider";
import { CardInfographic } from "@/components/card-infographic";
import { ModelSelector } from "@/components/model-selector";
import { DEFAULT_TEXT_MODEL, TEXT_MODELS } from "@/lib/ai/models";
import { useModelPreference } from "@/lib/ai/use-model-preference";
import type { CardNote as Note } from "@/lib/data/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedCard {
  id: number;
  question: string;
  answer: string;
}

type DeckFilter = "all" | "knowledge" | "oral";
type CardRowTab = "details" | "notes" | "chat" | "infographic";

const DECK_FILTERS: DeckFilter[] = ["all", "knowledge", "oral"];
const CARD_ROW_TABS: CardRowTab[] = [
  "details",
  "notes",
  "chat",
  "infographic",
];

function getDeckFilterLabel(deckFilter: DeckFilter): string {
  switch (deckFilter) {
    case "all":
      return "All";
    case "knowledge":
      return "Knowledge Test";
    case "oral":
      return "Checkride Oral";
  }
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DatabasePage() {
  const [cards, setCards] = useState<SearchCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deckFilter, setDeckFilter] = useState<DeckFilter>("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { version } = useDb();

  const fetchCards = useCallback(
    async (query: string, deck: string, pg: number) => {
      setIsLoading(true);
      const data = await searchCards({
        query,
        deckType: deck === "all" ? null : (deck as "knowledge" | "oral"),
        page: pg,
      });
      setCards(data);
      setIsLoading(false);
    },
    []
  );

  useEffect(() => {
    fetchCards(searchQuery, deckFilter, page);
  }, [deckFilter, page, fetchCards, version]);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchCards(value, deckFilter, 1);
    }, 300);
  };

  const handleDelete = async (cardId: number) => {
    await deleteCard(cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    if (expandedId === cardId) setExpandedId(null);
  };

  const handleCardUpdated = (updated: SearchCard) => {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const refreshList = () => {
    fetchCards(searchQuery, deckFilter, page);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Database className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Study Database</h1>
          <Badge variant="secondary" className="ml-auto">
            {cards.length} cards
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search cards, categories, regulations, references, notes..."
            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {DECK_FILTERS.map((d) => (
            <Button
              key={d}
              variant={deckFilter === d ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDeckFilter(d);
                setPage(1);
              }}
            >
              {getDeckFilterLabel(d)}
            </Button>
          ))}
        </div>

        {/* Card List */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            Loading...
          </div>
        ) : cards.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            No cards found
            {searchQuery && ` for "${searchQuery}"`}
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {cards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                isExpanded={expandedId === card.id}
                onToggle={() =>
                  setExpandedId(expandedId === card.id ? null : card.id)
                }
                onDelete={() => handleDelete(card.id)}
                onUpdated={handleCardUpdated}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {cards.length >= 50 && (
          <div className="flex items-center justify-center gap-3 mb-10">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Generate Section */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setGenerateOpen(!generateOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Generate New Cards</CardTitle>
              </div>
              {generateOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <CardDescription>
              Extend your deck with AI-generated cards on any topic
            </CardDescription>
          </CardHeader>
          {generateOpen && (
            <CardContent>
              <GenerateSection onGenerated={refreshList} />
            </CardContent>
          )}
        </Card>
    </main>
  );
}

// ─── Card Row ────────────────────────────────────────────────────────────────

function CardRow({
  card,
  isExpanded,
  onToggle,
  onDelete,
  onUpdated,
}: {
  card: SearchCard;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdated: (c: SearchCard) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editQ, setEditQ] = useState(card.question);
  const [editA, setEditA] = useState(card.answer);
  const [editRefs, setEditRefs] = useState(card.references || "");
  const [editAcs, setEditAcs] = useState(card.acsCode || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<CardRowTab>("details");

  const save = async () => {
    setSaving(true);
    try {
      await updateCard(card.id, {
        question: editQ,
        answer: editA,
        references: editRefs || null,
        acsCode: editAcs || null,
      });
      onUpdated({
        ...card,
        question: editQ,
        answer: editA,
        references: editRefs || null,
        acsCode: editAcs || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{card.question}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {card.categoryName}
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs"
          >
            {card.deckType === "knowledge" ? "Written" : "Oral"}
          </Badge>
          {card.acsCode && (
            <Badge variant="outline" className="font-mono text-xs">
              {card.acsCode}
            </Badge>
          )}
          {card.noteCount > 0 && (
            <Badge variant="default" className="text-xs">
              <StickyNote className="h-3 w-3 mr-0.5" />
              {card.noteCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b pb-2">
            {CARD_ROW_TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab)}
              >
                {tab === "details" && "Details"}
                {tab === "notes" && (
                  <>
                    <StickyNote className="h-3.5 w-3.5 mr-1" />
                    Notes
                  </>
                )}
                {tab === "chat" && (
                  <>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    AI Chat
                  </>
                )}
                {tab === "infographic" && (
                  <>
                    <ImageIcon className="h-3.5 w-3.5 mr-1" />
                    Infographic
                  </>
                )}
              </Button>
            ))}
            <div className="ml-auto flex gap-1">
              {!editing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setEditQ(card.question);
                      setEditA(card.answer);
                      setEditRefs(card.references || "");
                      setEditAcs(card.acsCode || "");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {!confirmDelete ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Details tab */}
          {activeTab === "details" && (
            <div className="space-y-3">
              {editing ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Question
                    </label>
                    <textarea
                      value={editQ}
                      onChange={(e) => setEditQ(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Answer
                    </label>
                    <textarea
                      value={editA}
                      onChange={(e) => setEditA(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        ACS Code
                      </label>
                      <input
                        type="text"
                        value={editAcs}
                        onChange={(e) => setEditAcs(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        References
                      </label>
                      <input
                        type="text"
                        value={editRefs}
                        onChange={(e) => setEditRefs(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Question
                    </label>
                    <p className="text-sm">{card.question}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Answer
                    </label>
                    <p className="text-sm">{card.answer}</p>
                  </div>
                  <div className="flex gap-6 text-xs text-muted-foreground">
                    {card.acsCode && <span>ACS: {card.acsCode}</span>}
                    {card.references && <span>Ref: {card.references}</span>}
                    <span>
                      EF: {card.easeFactor.toFixed(2)} | Interval:{" "}
                      {card.interval}d | Reps: {card.repetitions}
                    </span>
                    {card.isGenerated && (
                      <Badge variant="outline" className="text-xs">
                        AI Generated
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notes tab */}
          {activeTab === "notes" && <InlineNotes cardId={card.id} />}

          {/* Chat tab */}
          {activeTab === "chat" && <InlineChat cardId={card.id} />}

          {/* Infographic tab */}
          {activeTab === "infographic" && (
            <CardInfographic
              card={{
                id: card.id,
                question: card.question,
                answer: card.answer,
                acsCode: card.acsCode,
                references: card.references,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline Notes ────────────────────────────────────────────────────────────

function InlineNotes({ cardId }: { cardId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listNotes(cardId).then((all) => {
      if (cancelled) return;
      setNotes(all.filter((n) => n.type === "note"));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const saveNote = async () => {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    try {
      const saved = await addNote(cardId, newNote, "note");
      setNotes((prev) => [...prev, saved]);
      setNewNote("");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded)
    return (
      <div className="text-sm text-muted-foreground py-4">Loading notes...</div>
    );

  return (
    <div className="space-y-3">
      {notes.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="text-sm p-2.5 rounded bg-muted/50">
              <p className="whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No notes yet</p>
      )}
      <div className="flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              saveNote();
            }
          }}
        />
        <Button
          size="sm"
          onClick={saveNote}
          disabled={!newNote.trim() || saving}
          className="self-end"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Inline Chat ─────────────────────────────────────────────────────────────

function InlineChat({ cardId }: { cardId: number }) {
  const [messages, setMessages] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [model, setModel] = useModelPreference("chat", DEFAULT_TEXT_MODEL);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    listNotes(cardId).then((all) => {
      if (cancelled) return;
      setMessages(
        all.filter((n) => n.type === "ai_user" || n.type === "ai_assistant")
      );
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    if (!navigator.onLine) {
      alert("AI chat requires an internet connection.");
      return;
    }
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    const nowIso = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        cardId,
        type: "ai_user",
        content: userMsg,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ]);

    try {
      const res = await fetch(`/api/cards/${cardId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, model }),
      });
      const data = await res.json();
      const assistantIso = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: data.id || Date.now() + 1,
          cardId,
          type: "ai_assistant",
          content: data.error || data.content,
          createdAt: assistantIso,
          updatedAt: assistantIso,
        },
      ]);
      void syncEngine.syncNow();
    } catch {
      const errIso = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          cardId,
          type: "ai_assistant",
          content: "Failed to get response. Check your LLM configuration.",
          createdAt: errIso,
          updatedAt: errIso,
        },
      ]);
    }
    setSending(false);
  };

  if (!loaded)
    return (
      <div className="text-sm text-muted-foreground py-4">Loading chat...</div>
    );

  return (
    <div className="space-y-3">
      <div ref={scrollRef} className="space-y-2.5 max-h-64 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Ask the AI flight instructor anything about this card...
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.type === "ai_user" ? "justify-end" : ""}`}
          >
            {msg.type === "ai_assistant" && (
              <Bot className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
            )}
            <div
              className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                msg.type === "ai_user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.type === "ai_user" && (
              <User className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            )}
          </div>
        ))}
        {sending && (
          <div className="flex gap-2">
            <Bot className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <ModelSelector
          models={TEXT_MODELS}
          value={model}
          onChange={setModel}
          disabled={sending}
          aria-label="Chat model"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this card..."
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={sending}
        />
        <Button
          size="sm"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Generate Section ────────────────────────────────────────────────────────

const SUGGESTED_TOPICS = [
  "VOR Navigation",
  "Crosswind Landings",
  "Thunderstorm Avoidance",
  "Emergency Procedures",
  "Weight and Balance",
  "Airspace Requirements",
  "METAR/TAF Decoding",
  "Stall Recovery",
  "Engine Systems",
  "Night Flying",
  "Mountain Flying",
  "ATC Communications",
];

function GenerateSection({ onGenerated }: { onGenerated: () => void }) {
  const [topic, setTopic] = useState("");
  const [deckType, setDeckType] = useState<"knowledge" | "oral">("knowledge");
  const [cardCount, setCardCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useModelPreference(
    "generate-cards",
    DEFAULT_TEXT_MODEL
  );
  const [result, setResult] = useState<{
    cards: GeneratedCard[];
    provider: string;
    model: string;
  } | null>(null);

  const generate = async () => {
    if (!topic.trim()) return;
    if (!navigator.onLine) {
      alert("Generating cards requires an internet connection.");
      return;
    }
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/generate-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, deckType, count: cardCount, model }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setResult(data);
        await syncEngine.syncNow();
        onGenerated();
      }
    } catch {
      alert("Failed to generate cards. Check your LLM API key configuration.");
    }
    setIsGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Carburetor Icing, Class B Airspace..."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-2 block">
          Suggestions
        </label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.map((t) => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setTopic(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Deck Type</label>
          <div className="flex gap-2">
            <Button
              variant={deckType === "knowledge" ? "default" : "outline"}
              size="sm"
              onClick={() => setDeckType("knowledge")}
            >
              Knowledge Test
            </Button>
            <Button
              variant={deckType === "oral" ? "default" : "outline"}
              size="sm"
              onClick={() => setDeckType("oral")}
            >
              Checkride Oral
            </Button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Count</label>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((n) => (
              <Button
                key={n}
                variant={cardCount === n ? "default" : "outline"}
                size="sm"
                onClick={() => setCardCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModelSelector
          models={TEXT_MODELS}
          value={model}
          onChange={setModel}
          disabled={isGenerating}
          aria-label="Card generation model"
        />
      </div>

      <Button
        onClick={generate}
        disabled={isGenerating || !topic.trim()}
        className="w-full"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4 mr-2" />
        )}
        Generate {cardCount} Cards
      </Button>

      {result && (
        <div className="rounded-lg border bg-accent/20 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">
              Generated {result.cards.length} cards
            </span>
            <Badge variant="secondary" className="text-xs ml-auto">
              {result.provider}/{result.model}
            </Badge>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {result.cards.map((card) => (
              <div key={card.id} className="text-xs p-2 rounded bg-card border">
                <p className="font-medium">{card.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
