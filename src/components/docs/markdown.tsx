"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { CITATIONS } from "@/lib/docs/content";

/**
 * Lightweight Markdown → React renderer purpose-built for our docs.
 * Supports: # / ## / ### headers, paragraphs, bullet lists, code blocks,
 * inline code, bold (**x**), italics (*x*), links ([a](b)),
 * inline math $x$, block math $$x$$, and pipe tables.
 *
 * Citations — [label](#cite-<key>) — render as superscript hover chips.
 */
export function DocsMarkdown({ source }: { source: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return (
    <div
      className="prose prose-neutral max-w-none text-[15px] leading-[1.75] text-neutral-800 [&_code]:font-mono"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Block math
    if (line.trim().startsWith("$$")) {
      const start = i;
      i++;
      const buf: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("$$")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      const tex = buf.join("\n");
      out.push(
        `<div class="my-6 overflow-x-auto py-1">${renderMath(tex, true)}</div>`,
      );
      continue;
    }

    // Fenced code
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      i++;
      const buf: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(renderCodeBlock(buf.join("\n"), lang));
      continue;
    }

    // Table (pipe rows)
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[\s\-|:]+\|$/)) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      out.push(renderTable(rows));
      continue;
    }

    // Headers
    if (/^###\s+/.test(line)) {
      const t = line.replace(/^###\s+/, "");
      const id = slugify(t);
      out.push(
        `<h3 id="${id}" class="mt-7 mb-2 font-display text-lg font-medium tracking-tight text-neutral-900 scroll-mt-24">${renderInline(t)}</h3>`,
      );
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      const t = line.replace(/^##\s+/, "");
      const id = slugify(t);
      out.push(
        `<h2 id="${id}" class="mt-10 mb-3 font-display text-xl font-medium tracking-tight text-neutral-900 scroll-mt-24">${renderInline(t)}</h2>`,
      );
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      const t = line.replace(/^#\s+/, "");
      const id = slugify(t);
      out.push(
        `<h1 id="${id}" class="mt-10 mb-4 font-display text-2xl font-medium tracking-tight text-neutral-900 scroll-mt-24">${renderInline(t)}</h1>`,
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*- /.test(lines[i])) {
        items.push(lines[i].replace(/^\s*- /, ""));
        i++;
      }
      out.push(
        `<ul class="my-4 list-disc space-y-1 pl-5 text-neutral-700">${items
          .map((x) => `<li>${renderInline(x)}</li>`)
          .join("")}</ul>`,
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\. /, ""));
        i++;
      }
      out.push(
        `<ol class="my-4 list-decimal space-y-1 pl-5 text-neutral-700">${items
          .map((x) => `<li>${renderInline(x)}</li>`)
          .join("")}</ol>`,
      );
      continue;
    }

    // Blank
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    out.push(`<p class="my-3">${renderInline(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

function renderTable(rows: string[]): string {
  const parse = (r: string) =>
    r
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
  const header = parse(rows[0]);
  const body = rows.slice(2).map(parse);
  const th = header
    .map(
      (h) =>
        `<th class="border-b border-neutral-200 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-neutral-500">${renderInline(h)}</th>`,
    )
    .join("");
  const bodyHtml = body
    .map(
      (r) =>
        `<tr class="border-b border-neutral-100">${r
          .map(
            (c) =>
              `<td class="px-3 py-2 text-[14px] text-neutral-700">${renderInline(c)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<div class="my-6 overflow-x-auto rounded-lg border border-neutral-200"><table class="w-full border-collapse text-sm"><thead>${th}</thead><tbody>${bodyHtml}</tbody></table></div>`;
}

function renderCodeBlock(code: string, _lang: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre class="my-5 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-[13px] leading-relaxed text-neutral-800"><code>${escaped}</code></pre>`;
}

function renderInline(text: string): string {
  let out = text;

  // Inline math $...$ (non-greedy, not matching $$)
  out = out.replace(/\$([^$\n]+)\$/g, (_, tex) => renderMath(tex, false));

  // Citation links: [text](#cite-key)
  out = out.replace(/\[([^\]]+)\]\(#cite-([^)]+)\)/g, (_, label, key) => {
    const c = CITATIONS.find((x) => x.key === key);
    if (!c) return label;
    const tip = `${c.authors} — ${c.title} (${c.venue} ${c.year})`;
    return `<a href="${c.url}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(tip)}" class="border-b border-[#3DD6D0]/40 text-neutral-800 transition-colors hover:border-[#3DD6D0] hover:text-[#3DD6D0]">${label}</a>`;
  });

  // Standard links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline decoration-neutral-300 underline-offset-2 transition-colors hover:decoration-[#3DD6D0] hover:text-[#3DD6D0]">$1</a>',
  );

  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-medium text-neutral-900">$1</strong>');

  // Inline code
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-800">$1</code>',
  );

  // Italic (* x *) — only single asterisks, after bold has been consumed
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  return out;
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      trust: false,
      strict: "ignore",
    });
  } catch (e) {
    return `<span class="text-red-500">[katex error: ${String(e)}]</span>`;
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
