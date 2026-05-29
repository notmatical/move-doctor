import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
}

export const Markdown = ({ children }: MarkdownProps) => (
  <div className="prose">
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="mt-8 mb-4 font-bold text-3xl tracking-tight">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-8 mb-3 font-bold text-2xl tracking-tight">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-6 mb-2 font-bold text-xl tracking-tight">
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
        ul: ({ children }) => (
          <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>
        ),
        a: ({ href, children }) => (
          <a className="underline decoration-[var(--color-accent)]" href={href}>
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[0.9em] text-[var(--color-accent)]">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="my-4 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-[var(--color-paper)] text-sm">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-[var(--color-accent)] border-l-4 pl-4 text-[var(--color-faint)]">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <table className="my-4 border-collapse text-sm">{children}</table>
        ),
        th: ({ children }) => (
          <th className="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-[var(--color-border)] px-3 py-2">
            {children}
          </td>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {children}
    </ReactMarkdown>
  </div>
);
