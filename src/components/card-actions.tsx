"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StickyNote,
  MessageSquare,
  Copy,
  X,
  Send,
  Loader2,
  Trash2,
  Bot,
  User,
} from "lucide-react";

interface Note {
  id: number;
  type: "note" | "ai_user" | "ai_assistant";
  content: string;
  createdAt: string;
}

interface CardActionsProps {
  cardId: number;
  onDuplicate?: () => void;
}

export function CardActions({ cardId, onDuplicate }: CardActionsProps) {
  const [activePanel, setActivePanel] = useState<
    "notes" | "chat" | null
  >(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const togglePanel = (panel: "notes" | "chat") => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Action buttons */}
      <div className="flex items-center justify-center gap-2">
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
    </div>
  );
}

function NotesPanel({ cardId }: { cardId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/cards/${cardId}/notes`)
      .then((r) => r.json())
      .then((all: Note[]) => setNotes(all.filter((n) => n.type === "note")));
  }, [cardId]);

  const saveNote = async () => {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    const res = await fetch(`/api/cards/${cardId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote, type: "note" }),
    });
    const saved = await res.json();
    setNotes((prev) => [...prev, saved]);
    setNewNote("");
    setSaving(false);
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

      {notes.length > 0 && (
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

function ChatPanel({ cardId }: { cardId: number }) {
  const [messages, setMessages] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/cards/${cardId}/notes`)
      .then((r) => r.json())
      .then((all: Note[]) =>
        setMessages(
          all.filter((n) => n.type === "ai_user" || n.type === "ai_assistant")
        )
      );
  }, [cardId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "ai_user",
        content: userMsg,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch(`/api/cards/${cardId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: "ai_assistant",
            content: `Error: ${data.error}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            type: "ai_assistant",
            content: data.content,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "ai_assistant",
          content: "Failed to get response. Check your LLM configuration.",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setSending(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        AI Chat
        <Badge variant="secondary" className="text-xs">
          Flight Instructor
        </Badge>
      </div>

      <div ref={scrollRef} className="space-y-3 max-h-64 overflow-y-auto">
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
