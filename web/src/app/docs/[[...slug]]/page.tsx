"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useState } from "react";
import { cn } from "@/lib/utils";
import { categories, getDoc, type DocPage } from "@/lib/docs";
import { Navbar } from "@/components/marketing/navbar";
import { Terminal, ChevronRight, ExternalLink, Copy, Check } from "lucide-react";

export default function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = use(params);
  const pathname = usePathname();
  const docSlug = slug?.join("/") || "quickstart";
  const doc = getDoc(docSlug);

  return (
    <>
      <Navbar />
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border/40 px-4 py-8 lg:block">
          {categories.map((cat) => (
            <div key={cat.name} className="mb-6">
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {cat.name}
              </h3>
              <ul className="space-y-0.5">
                {cat.pages.map((page) => {
                  const href = `/docs/${page.slug}`;
                  const active =
                    pathname === href ||
                    (page.slug === "quickstart" && pathname === "/docs");
                  return (
                    <li key={page.slug}>
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {page.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-8 py-8 lg:px-16">
          {doc ? (
            <DocContent doc={doc} />
          ) : (
            <div className="text-center py-20">
              <h1 className="text-2xl font-bold">Page not found</h1>
              <p className="mt-2 text-muted-foreground">
                This documentation page doesn&apos;t exist yet.
              </p>
              <Link
                href="/docs/quickstart"
                className="mt-4 inline-flex items-center gap-1 text-primary hover:underline"
              >
                Go to Quickstart
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function DocContent({ doc }: { doc: DocPage }) {
  return (
    <article>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">{doc.category}</p>
        <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{doc.description}</p>
      </div>

      <div className="prose prose-invert max-w-none">
        <MarkdownRenderer content={doc.content} />
      </div>
    </article>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = content.split("\n\n");

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        // Code blocks
        if (trimmed.startsWith("```")) {
          const lines = trimmed.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");
          return <CodeBlock key={i} lang={lang} code={code} />;
        }

        // Headings
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-xl font-bold mt-10 mb-2">
              {trimmed.replace("## ", "")}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-lg font-semibold mt-8 mb-2">
              {trimmed.replace("### ", "")}
            </h3>
          );
        }

        // Tables
        if (trimmed.includes("|") && trimmed.includes("---")) {
          const rows = trimmed
            .split("\n")
            .filter((r) => !r.match(/^\|[\s-|]+\|$/));
          const headers = rows[0]
            ?.split("|")
            .filter(Boolean)
            .map((c) => c.trim());
          const body = rows.slice(1).map((r) =>
            r
              .split("|")
              .filter(Boolean)
              .map((c) => c.trim())
          );
          return (
            <div key={i} className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {headers?.map((h, j) => (
                      <th
                        key={j}
                        className="px-4 py-2 text-left font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, j) => (
                    <tr key={j} className="border-b border-border/30">
                      {row.map((cell, k) => (
                        <td key={k} className="px-4 py-2">
                          <InlineMarkdown text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-primary/50 pl-4 text-sm text-muted-foreground italic"
            >
              <InlineMarkdown text={trimmed.replace(/^>\s*/gm, "")} />
            </blockquote>
          );
        }

        // Ordered/Unordered lists
        if (trimmed.match(/^(\d+\.|- )/m)) {
          const items = trimmed.split("\n").filter(Boolean);
          const ordered = items[0]?.match(/^\d+\./);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              className={cn(
                "space-y-1 text-sm text-muted-foreground pl-5",
                ordered ? "list-decimal" : "list-disc"
              )}
            >
              {items.map((item, j) => (
                <li key={j}>
                  <InlineMarkdown
                    text={item.replace(/^(\d+\.|- )/, "").trim()}
                  />
                </li>
              ))}
            </Tag>
          );
        }

        // Paragraphs
        if (trimmed) {
          return (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              <InlineMarkdown text={trimmed} />
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  // Process inline markdown: **bold**, `code`, [links](url)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Link
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    const matches = [
      boldMatch && { type: "bold", index: boldMatch.index!, match: boldMatch },
      codeMatch && { type: "code", index: codeMatch.index!, match: codeMatch },
      linkMatch && { type: "link", index: linkMatch.index!, match: linkMatch },
    ]
      .filter(Boolean)
      .sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {first.match[1]}
        </strong>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "code") {
      parts.push(
        <code
          key={key++}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
        >
          {first.match[1]}
        </code>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "link") {
      const href = first.match[2];
      const isExternal = href.startsWith("http");
      parts.push(
        <Link
          key={key++}
          href={href}
          className="text-primary hover:underline inline-flex items-center gap-0.5"
          {...(isExternal ? { target: "_blank", rel: "noopener" } : {})}
        >
          {first.match[1]}
          {isExternal && <ExternalLink className="h-3 w-3" />}
        </Link>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return <>{parts}</>;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="text-zinc-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}
