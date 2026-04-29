import { getRequestConfig } from "next-intl/server";
import { getLocale } from "../../i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale || "cs";
  const validated = getLocale(locale);

  return {
    locale,
    messages: (await import(`../messages/${validated}.json`)).default,
  };
});
