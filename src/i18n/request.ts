import { getRequestConfig } from "next-intl/server";

const validLocales = ["cs", "en", "uk"];

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = typeof requestLocale !== "string"
    ? await requestLocale
    : requestLocale;

  const locale = validLocales.includes(resolved || "cs" as any)
    ? resolved || "cs"
    : "cs";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
