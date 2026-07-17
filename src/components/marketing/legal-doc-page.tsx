import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/logo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { readLegalDoc } from "@/lib/legal-docs";

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "bullet"; text: string };

/**
 * Parses a raw legal document (.txt) into structured blocks.
 *
 * Layout of every doc in `doc/`:
 *   POSTIO
 *   <Title>
 *   <url> | <email>
 *   Naposledy aktualizováno: <date>
 *   (blank lines)
 *   <Title>            <- repeated (skipped)
 *   Naposledy ...      <- repeated (skipped)
 *   1. SECTION         <- body starts here
 *
 * Rules (Prompt 033, Krok 4):
 *   - top-level "N. Heading"      -> <h2>
 *   - sub-level  "N.N Heading"    -> <h3> (body text on the same line is split off as a <p>)
 *   - "* item"                    -> bullet
 *   - blank line                  -> spacing (not rendered)
 *   - anything else               -> <p>
 */
function parseLegalDoc(raw: string): {
  title: string;
  lastUpdated: string;
  blocks: Block[];
} {
  const lines = raw.split(/\r?\n/);

  const title =
    lines.find((l) => {
      const t = l.trim();
      return (
        t &&
        t !== "POSTIO" &&
        !/^https?:\/\//.test(t) &&
        !t.includes("@") &&
        !/naposledy aktualizováno/i.test(t)
      );
    })?.trim() ?? "";

  const dateLine = lines.find((l) => /naposledy aktualizováno/i.test(l));
  const lastUpdated = dateLine
    ? dateLine.replace(/.*naposledy aktualizováno[:\s]*/i, "").trim()
    : "";

  // Body starts at the first numbered section; everything before it
  // (header block + the repeated title/date) is dropped.
  const bodyStart = lines.findIndex((l) => /^\d+\.(\d+)?\s+/.test(l));
  const body = bodyStart === -1 ? lines : lines.slice(bodyStart);

  const blocks: Block[] = [];
  for (const line of body) {
    const t = line.trim();
    if (!t) continue;

    if (/^\d+\.\d+\s+/.test(t)) {
      // Sub-section: split an inline "Heading. Body text." into heading + paragraph.
      const m = t.match(/^(\d+\.\d+\s+[^.]+)\.\s+(.*)$/);
      if (m) {
        blocks.push({ type: "h3", text: `${m[1].trim()}.` });
        if (m[2].trim()) blocks.push({ type: "p", text: m[2].trim() });
      } else {
        blocks.push({ type: "h3", text: t });
      }
    } else if (/^\d+\.\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(t)) {
      blocks.push({ type: "h2", text: t });
    } else if (t.startsWith("* ")) {
      blocks.push({ type: "bullet", text: t.slice(2).trim() });
    } else {
      blocks.push({ type: "p", text: t });
    }
  }

  return { title, lastUpdated, blocks };
}

/**
 * Server component rendering a legal document loaded from `doc/<fileName>`.
 *
 * Layout mirrors the existing `/privacy` page: a top bar with the Logo that
 * links back home, the document title + "Naposledy aktualováno" line, the
 * parsed body, and the shared `SiteFooter`.
 */
export async function LegalDocPage({
  locale,
  fileName,
}: {
  locale: string;
  fileName: string;
}) {
  const raw = await readLegalDoc(fileName);
  const { title, lastUpdated, blocks } = parseLegalDoc(raw);
  const common = await getTranslations({ locale, namespace: "common" });

  // Group consecutive bullets into a single <ul>.
  const elements: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === "bullet") {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === "bullet") {
        items.push(blocks[i].text);
        i++;
      }
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          className="list-disc space-y-1 pl-6 text-muted-foreground"
        >
          {items.map((item, k) => (
            <li key={k}>{item}</li>
          ))}
        </ul>,
      );
    } else {
      if (block.type === "h2") {
        elements.push(
          <h2
            key={`h2-${i}`}
            className="text-xl font-semibold text-white"
          >
            {block.text}
          </h2>,
        );
      } else if (block.type === "h3") {
        elements.push(
          <h3
            key={`h3-${i}`}
            className="text-lg font-medium text-white"
          >
            {block.text}
          </h3>,
        );
      } else {
        elements.push(
          <p
            key={`p-${i}`}
            className="leading-relaxed text-muted-foreground"
          >
            {block.text}
          </p>,
        );
      }
      i++;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground font-sans">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center">
          <Link
            href={`/${locale}/`}
            className="hover:opacity-80 transition-opacity"
          >
            <Logo className="text-2xl" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 pb-48 lg:py-24 lg:pb-32">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {title}
            </h1>
            {lastUpdated && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Naposledy aktualizováno: {lastUpdated}
              </p>
            )}
          </div>

          <div className="mt-10 space-y-5">{elements}</div>
        </div>
      </main>

      <SiteFooter locale={locale} />

      <div className="flex justify-center px-6 pb-16">
        <Link
          href={`/${locale}/`}
          className="relative z-10 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-white/10 hover:border-white/20 backdrop-blur-sm"
        >
          {common("back")}
        </Link>
      </div>
    </div>
  );
}
