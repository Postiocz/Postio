import { LegalDocPage } from "@/components/marketing/legal-doc-page";

export const runtime = "nodejs";

export default async function DpaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocPage locale={locale} fileName="03_Postio_Smlouva_o_zpracovani_osobnich_udaju_DPA.txt" />;
}
