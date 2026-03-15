"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownMessageProps {
  content: string;
  role: "user" | "assistant";
}

export function MarkdownMessage({ content, role }: MarkdownMessageProps) {
  if (role === "user") {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:mb-2 prose-headings:mt-3 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-hr:my-3 prose-a:text-teal-600 dark:prose-a:text-teal-400 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-teal-700 dark:prose-code:text-teal-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 underline decoration-teal-300 hover:text-teal-700 dark:text-teal-400 dark:decoration-teal-700"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h3 className="text-base font-bold">{children}</h3>
          ),
          h2: ({ children }) => (
            <h4 className="text-sm font-bold">{children}</h4>
          ),
          h3: ({ children }) => (
            <h5 className="text-sm font-semibold">{children}</h5>
          ),
          hr: () => (
            <hr className="border-gray-200 dark:border-gray-700" />
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-teal-300 pl-3 italic text-gray-600 dark:border-teal-700 dark:text-gray-400">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
