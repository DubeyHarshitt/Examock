// src/pages/rag/ChatPage.tsx
// AI doubt-solving chat. Sends { question } to POST /rag/chat and renders the
// answer plus source file names. Includes a typing indicator and quick
// suggested prompts.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  User as UserIcon,
  UploadCloud,
  Sparkles,
  FileText,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import Markdown from "../../components/shared/Markdown";
import { Button } from "../../components/ui";
import { useAskQuestion } from "../../hooks/rag/useRag";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  sources?: string[];
}

const SUGGESTED_QUESTIONS = [
  "Explain Newton's second law with an example",
  "What is the difference between speed and velocity?",
  "Summarise the periodic table trends",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const askMutation = useAskQuestion();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, askMutation.isPending]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || askMutation.isPending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await askMutation.mutateAsync(question);
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          content: res.answer,
          sources: res.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          content:
            "Sorry, I couldn't fetch an answer right now. Please upload study material and try again.",
        },
      ]);
    }
  };

  return (
    <AppShell section="student">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ask ExaBot</h1>
          <p className="text-sm text-gray-500 mt-1">
            Get answers grounded in your uploaded study notes
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <UploadCloud className="w-4 h-4" /> Upload a PDF
        </Link>
      </div>

      {/* ── Chat panel ───────────────────────────────────────── */}
      <div className="mt-6 card-surface flex flex-col overflow-hidden">
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4"
          style={{ minHeight: "420px", maxHeight: "60vh" }}
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-card flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                Your AI study assistant
              </p>
              <p className="mt-1 text-sm text-slate-500 max-w-sm">
                Ask anything about your syllabus. For best answers, upload a PDF
                of your notes first.
              </p>
              <div className="mt-5 flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="group text-left text-xs text-slate-700 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-slate-200 rounded-xl px-3 py-2.5 transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {q}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 ml-auto transition-colors" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {askMutation.isPending && (
            <div className="flex items-start gap-3">
              <BotAvatar />
              <div className="bg-white border border-slate-200 shadow-card rounded-2xl rounded-tl-none px-4 py-3">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-slate-100 p-3 flex items-end gap-2 bg-slate-50"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder="Ask a doubt…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <Button
            type="submit"
            disabled={!input.trim() || askMutation.isPending}
            icon={<Send className="w-4 h-4" />}
          >
            Send
          </Button>
        </form>
      </div>
    </AppShell>
  );
}

function BotAvatar() {
  return (
    <div className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
      <img src="/logo-mark.svg" alt="Examock AI" className="w-6 h-6" draggable={false} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[80%] bg-brand-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className="w-9 h-9 rounded-xl bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center shrink-0">
          <UserIcon className="w-4 h-4 text-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <BotAvatar />
      <div className="max-w-[85%] space-y-2">
        <div className="bg-white border border-slate-200 shadow-card rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-700 break-words">
          {/* Render the model's Markdown (bold, lists, tables) instead of raw * characters */}
          <Markdown>{message.content}</Markdown>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.sources.map((src) => (
              <span
                key={src}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1"
              >
                <FileText className="w-3 h-3 text-slate-400" />
                {src}
              </span>
            ))}
          </div>
        )}
        {message.content.includes("No study material found") && (
          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Upload notes to get answers
          </Link>
        )}
      </div>
    </div>
  );
}

