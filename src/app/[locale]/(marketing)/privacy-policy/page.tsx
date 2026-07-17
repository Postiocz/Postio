import { LegalDocPage } from "@/components/marketing/legal-doc-page";

export const runtime = "nodejs";

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocPage locale={locale} fileName="01_Postio_Zasady_ochrany_osobnich_udaju.txt" />;
}
