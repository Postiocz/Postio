import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/marketing/reveal";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

// Public FAQ section. Questions/answers live in the landing i18n namespace
// (landing.faq.items) and are passed as raw data to the client accordion.
export async function FaqSection() {
  const t = await getTranslations("landing");
  const items = t.raw("faq.items") as { q: string; a: string }[];

  return (
    <section
      id="faq"
      className="relative mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 md:py-28"
    >
      <Reveal>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("faq.heading")}
        </h2>
        <p className="mt-3 max-w-[60ch] text-base text-muted-foreground">
          {t("faq.subheading")}
        </p>
      </Reveal>
      <Reveal delay={0.1} className="mt-10">
        <FaqAccordion items={items} />
      </Reveal>
    </section>
  );
}
