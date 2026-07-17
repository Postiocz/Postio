import { LegalDocPage } from "@/components/marketing/legal-doc-page";

export const runtime = "nodejs";

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocPage locale={locale} fileName="02_Postio_Obchodni_podminky.txt" />;
}
