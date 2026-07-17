import { LegalDocPage } from "@/components/marketing/legal-doc-page";

export const runtime = "nodejs";

export default async function AiTransparencyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocPage locale={locale} fileName="04_Postio_Oznameni_o_transparentnosti_AI.txt" />;
}
