"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  categories,
  getDoc,
  getAdjacentPages,
  type DocPage,
} from "@/lib/docs";
import { Navbar } from "@/components/marketing/navbar";
import {
  Terminal,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Rocket,
  Code,
  Package,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Hash,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  rocket: <Rocket className="h-4 w-4" />,
  terminal: <Terminal className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
};

export default function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = use(params);
  const pathname = usePathname();
  const docSlug = slug?.join("/") || "introduction";
  const doc = getDoc(docSlug);
  const adjacent = getAdjacentPages(docSlug);

  return (
    <>
      <Navbar />
      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-border/40 py-8 lg:block">
          <div className="px-4">
            {categories.map((cat) => (
              <div key={cat.name} className="mb-6">
                <h3 className="flex items-center gap-2 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {categoryIcons[cat.icon]}
                  {cat.name}
                </h3>
                <ul className="space-y-0.5">
                  {cat.pages.map((page) => {
                    const href = `/docs/${page.slug}`;
                    const active =
                      pathname === href ||
                      (page.slug === "introduction" && pathname === "/docs");
                    return (
                      <li key={page.slug}>
                        <Link
                          href={href}
                          className={cn(
                            "flex items-center rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-8 py-8 lg:px-16 lg:py-12">
          {doc ? (
            <>
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                <Link href="/docs" className="hover:text-foreground">
                  Docs
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{doc.category}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{doc.title}</span>
              </div>

              <DocContent doc={doc} />

              {/* Prev/Next Navigation */}
              <div className="mt-16 flex items-stretch gap-4 border-t border-border/40 pt-8">
                {adjacent.prev ? (
                  <Link
                    href={`/docs/${adjacent.prev.slug}`}
                    className="group flex flex-1 flex-col rounded-xl border border-border/60 p-5 transition-colors hover:border-primary/30 hover:bg-accent/20"
                  >
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowLeft className="h-3 w-3" />
                      Previous
                    </span>
                    <span className="mt-1 text-sm font-medium group-hover:text-primary">
                      {adjacent.prev.title}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {adjacent.next ? (
                  <Link
                    href={`/docs/${adjacent.next.slug}`}
                    className="group flex flex-1 flex-col items-end rounded-xl border border-border/60 p-5 transition-colors hover:border-primary/30 hover:bg-accent/20"
                  >
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      Next
                      <ArrowRight className="h-3 w-3" />
                    </span>
                    <span className="mt-1 text-sm font-medium group-hover:text-primary">
                      {adjacent.next.title}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <h1 className="text-2xl font-bold">Page not found</h1>
              <p className="mt-2 text-muted-foreground">
                This page doesn&apos;t exist yet.
              </p>
              <Link
                href="/docs/introduction"
                className="mt-4 inline-flex items-center gap-1 text-primary hover:underline"
              >
                Go to Introduction
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </main>

        {/* Table of Contents */}
        {doc && <TableOfContents content={doc.content} />}
      </div>
    </>
  );
}

function TableOfContents({ content }: { content: string }) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const h = content
      .split("\n")
      .filter((l) => l.startsWith("## ") || l.startsWith("### "))
      .map((l) => {
        const level = l.startsWith("### ") ? 3 : 2;
        const text = l.replace(/^#{2,3}\s+/, "");
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return { id, text, level };
      });
    setHeadings(h);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 overflow-y-auto py-12 xl:block">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </h4>
      <ul className="space-y-1">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "block text-xs py-1 transition-colors",
                h.level === 3 ? "pl-3" : "",
                active === h.id
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function DocContent({ doc }: { doc: DocPage }) {
  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
        {doc.description}
      </p>
      <div className="mt-10">
        <MarkdownRenderer content={doc.content} />
      </div>
    </article>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = content.split("\n\n");

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        if (trimmed.startsWith("```")) {
          const lines = trimmed.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");
          return <CodeBlock key={i} lang={lang} code={code} />;
        }

        if (trimmed.startsWith("## ")) {
          const text = trimmed.replace("## ", "");
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return (
            <h2
              key={i}
              id={id}
              className="group flex items-center gap-2 text-xl font-bold mt-12 mb-2 scroll-mt-20"
            >
              {text}
              <a href={`#${id}`} className="opacity-0 group-hover:opacity-50 transition-opacity">
                <Hash className="h-4 w-4" />
              </a>
            </h2>
          );
        }

        if (trimmed.startsWith("### ")) {
          const text = trimmed.replace("### ", "");
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return (
            <h3
              key={i}
              id={id}
              className="group flex items-center gap-2 text-base font-semibold mt-8 mb-2 scroll-mt-20"
            >
              {text}
              <a href={`#${id}`} className="opacity-0 group-hover:opacity-50 transition-opacity">
                <Hash className="h-3.5 w-3.5" />
              </a>
            </h3>
          );
        }

        if (trimmed.startsWith("> ")) {
          const text = trimmed.replace(/^>\s*/gm, "");
          return (
            <div
              key={i}
              className="rounded-lg border-l-4 border-primary/50 bg-primary/5 px-5 py-4 text-sm text-foreground/80"
            >
              <InlineMarkdown text={text} />
            </div>
          );
        }

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
            <div
              key={i}
              className="overflow-x-auto rounded-lg border border-border/60"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {headers?.map((h, j) => (
                      <th
                        key={j}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, j) => (
                    <tr
                      key={j}
                      className="border-b border-border/30 last:border-0"
                    >
                      {row.map((cell, k) => (
                        <td key={k} className="px-4 py-2.5 text-sm">
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

        if (trimmed.match(/^(\d+\.|- )/m)) {
          const items = trimmed.split("\n").filter(Boolean);
          const ordered = items[0]?.match(/^\d+\./);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag
              key={i}
              className={cn(
                "space-y-2 text-sm text-foreground/80 pl-5 leading-relaxed",
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

        if (trimmed) {
          return (
            <p
              key={i}
              className="text-sm leading-relaxed text-foreground/80"
            >
              <InlineMarkdown text={trimmed} />
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="text-[11px] font-medium text-zinc-500">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-500 transition-all hover:bg-white/5 hover:text-zinc-300"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="text-zinc-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
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
    if (first.index > 0) parts.push(remaining.slice(0, first.index));

    if (first.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {first.match[1]}
        </strong>
      );
    } else if (first.type === "code") {
      parts.push(
        <code
          key={key++}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground"
        >
          {first.match[1]}
        </code>
      );
    } else if (first.type === "link") {
      const href = first.match[2];
      const isExternal = href.startsWith("http");
      parts.push(
        <Link
          key={key++}
          href={href}
          className="text-primary font-medium hover:underline inline-flex items-center gap-0.5"
          {...(isExternal ? { target: "_blank", rel: "noopener" } : {})}
        >
          {first.match[1]}
          {isExternal && <ExternalLink className="h-3 w-3" />}
        </Link>
      );
    }

    remaining = remaining.slice(first.index + first.match[0].length);
  }

  return <>{parts}</>;
}
