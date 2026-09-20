// src/components/shared/Markdown.tsx
// Renders the LLM's Markdown output safely with app styling.
//
// - `react-markdown` does NOT render raw HTML by default, so any stray HTML the
//   model outputs is dropped instead of executed — safe by default.
// - `remark-gfm` adds tables, strikethrough, and task lists, which Gemini/LLM
//   answers commonly include.
// - Each Markdown element is mapped to a Tailwind-styled component so `**bold**`
//   shows as bold text instead of the raw `**` characters.

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-slate-900 mt-3 mb-1.5 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-slate-900 mt-3 mb-1 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-bold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through">{children}</del>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand-200 bg-brand-50/50 rounded-r-lg px-3 py-2 my-2 text-slate-600">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    // Inline `code` vs fenced ```code``` blocks are distinguished by the
    // class react-markdown attaches via the `language-*` shiki-style class.
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className="block bg-slate-900 text-slate-100 rounded-lg px-3 py-2 overflow-x-auto text-xs my-2 font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-100 text-slate-800 rounded px-1.5 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-2">{children}</pre>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 text-slate-900 font-semibold">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 px-2 py-1.5 text-slate-700">
      {children}
    </td>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-600 underline hover:text-brand-700"
    >
      {children}
    </a>
  ),
  hr: () => (
    <hr className="border-slate-200 my-3" />
  ),
  input: ({ disabled, checked }) => (
    <input
      type="checkbox"
      disabled={disabled}
      checked={checked}
      readOnly
      className="mr-1.5 align-middle"
    />
  ),
};

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-slate-700 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}