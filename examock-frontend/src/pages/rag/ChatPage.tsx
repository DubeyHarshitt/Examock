// src/pages/rag/ChatPage.tsx
// AI doubt-solving chat. Sends { question } to POST /rag/chat and renders the
// answer plus source file names. Includes a typing indicator and quick
// suggested prompts.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Bot,
  User as UserIcon,
  UploadCloud,
  Sparkles,
  FileText,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

import AppShell from "../../components/layout/AppShell";
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
          <h1 className="text-xl font-bold text-gray-900">Ask AI</h1>
          <p className="text-sm text-gray-500 mt-1">
            Get answers grounded in your uploaded study notes
          </p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          <UploadCloud className="w-4 h-4" /> Upload a PDF
        </Link>
      </div>

      {/* ── Chat panel ───────────────────────────────────────── */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4"
          style={{ minHeight: "420px", maxHeight: "60vh" }}
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-indigo-600" />
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-900">
                Your AI study assistant
              </p>
              <p className="mt-1 text-sm text-gray-500 max-w-sm">
                Ask anything about your syllabus. For best answers, upload a PDF
                of your notes first.
              </p>
              <div className="mt-5 flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="text-left text-xs text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {q}
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
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
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
          className="border-t border-gray-100 p-3 flex items-end gap-2 bg-gray-50"
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
            className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
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

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <UserIcon className="w-4 h-4 text-gray-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="max-w-[85%] space-y-2">
        <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap break-words">
          {message.content}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.sources.map((src) => (
              <span
                key={src}
                className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1"
              >
                <FileText className="w-3 h-3 text-gray-400" />
                {src}
              </span>
            ))}
          </div>
        )}
        {message.content ===
          "No study material found. Please upload a PDF or ask your admin to add notes." && (
          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Upload notes to get answers
          </Link>
        )}
      </div>
    </div>
  );
}

