"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote,
  MessageSquare,
  ImageIcon,
  Copy,
  X,
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
} from "lucide-react";
import { addNote, insertNoteFromServer, listNotes } from "@/lib/data/notes";
import { CardInfographic } from "@/components/card-infographic";
import { ModelSelector } from "@/components/model-selector";
import { DEFAULT_TEXT_MODEL, TEXT_MODELS } from "@/lib/ai/models";
import { useModelPreference } from "@/lib/ai/use-model-preference";
import type { CardNote as Note } from "@/lib/data/types";

type ActionPanel = "notes" | "chat" | "infographic";

interface CardActionsProps {
  cardId: number;
  question: string;
  answer: string;
  acsCode?: string | null;
  references?: string | null;
  onDuplicate?: () => void;
}

export function CardActions({
  cardId,
  question,
  answer,
  acsCode,
  references,
  onDuplicate,
}: CardActionsProps) {
  const [activePanel, setActivePanel] = useState<ActionPanel | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  function togglePanel(panel: ActionPanel): void {
    setActivePanel((currentPanel) => (currentPanel === panel ? null : panel));
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant={activePanel === "notes" ? "default" : "outline"}
          size="sm"
          onClick={() => togglePanel("notes")}
        >
          <StickyNote className="h-4 w-4 mr-1.5" />
          Notes
        </Button>
        <Button
          variant={activePanel === "chat" ? "default" : "outline"}
          size="sm"
          onClick={() => togglePanel("chat")}
        >
          <MessageSquare className="h-4 w-4 mr-1.5" />
          AI Chat
        </Button>
        <Button
          variant={activePanel === "infographic" ? "default" : "outline"}
          size="sm"
          onClick={() => togglePanel("infographic")}
        >
          <ImageIcon className="h-4 w-4 mr-1.5" />
          Infographic
        </Button>
        {!confirmDuplicate ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDuplicate(true)}
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
          >
            <Copy className="h-4 w-4 mr-1.5" />
            Duplicate
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmDuplicate(false);
                onDuplicate?.();
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDuplicate(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Notes Panel */}
      {activePanel === "notes" && (
        <NotesPanel cardId={cardId} />
      )}

      {/* Chat Panel */}
      {activePanel === "chat" && (
        <ChatPanel cardId={cardId} />
      )}

      {/* Infographic Panel */}
      {activePanel === "infographic" && (
        <CardInfographic
          card={{ id: cardId, question, answer, acsCode, references }}
        />
      )}
    </div>
  );
}

function NotesPanel({ cardId }: { cardId: number }) {
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

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <StickyNote className="h-4 w-4" />
        Notes
        {notes.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {notes.length}
          </Badge>
        )}
      </div>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">Loading notes...</p>
      ) : notes.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className="text-sm p-2 rounded bg-muted/50"
            >
              <p className="whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
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
              void saveNote();
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => void saveNote()}
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

function ChatPanel({ cardId }: { cardId: number }) {
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
    const userMsg = input.trim();
    setInput("");
    setSending(true);
    const optimisticId = -Date.now();
    const nowIso = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
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
      if (data.user) {
        await insertNoteFromServer(data.user);
      }
      if (data.error) {
        setMessages((prev) => [
          ...prev.filter((msg) => msg.id !== optimisticId),
          data.user ?? {
            id: optimisticId,
            cardId,
            type: "ai_user",
            content: userMsg,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          {
            id: Date.now() + 1,
            cardId,
            type: "ai_assistant",
            content: `Error: ${data.error}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      } else {
        if (data.assistant) {
          await insertNoteFromServer(data.assistant);
        }
        const assistantIso = new Date().toISOString();
        setMessages((prev) => [
          ...prev.filter((msg) => msg.id !== optimisticId),
          data.user ?? {
            id: optimisticId,
            cardId,
            type: "ai_user",
            content: userMsg,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          data.assistant ?? {
            id: data.id,
            cardId,
            type: "ai_assistant",
            content: data.content,
            createdAt: assistantIso,
            updatedAt: assistantIso,
          },
        ]);
      }
    } catch {
      const errorIso = new Date().toISOString();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          cardId,
          type: "ai_assistant",
          content:
            "AI chat requires an internet connection. Try again when you're online.",
          createdAt: errorIso,
          updatedAt: errorIso,
        },
      ]);
    }
    setSending(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        AI Chat
        <Badge variant="secondary" className="text-xs">
          Flight Instructor
        </Badge>
        <ModelSelector
          models={TEXT_MODELS}
          value={model}
          onChange={setModel}
          disabled={sending}
          aria-label="Chat model"
          className="ml-auto"
        />
      </div>

      <div ref={scrollRef} className="space-y-3 max-h-64 overflow-y-auto">
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        ) : messages.length === 0 && (
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
              void sendMessage();
            }
          }}
          disabled={sending}
        />
        <Button
          size="sm"
          onClick={() => void sendMessage()}
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
