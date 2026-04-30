"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const locales = [
  { code: "cs", label: "Čeština" },
  { code: "en", label: "English" },
  { code: "uk", label: "Українська" },
];

export function LocaleSwitcher() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentLocale = pathname.split("/")[1];

  const handleChange = (newLocale: string) => {
    // Hard navigation required: next-intl loads messages server-side via getMessages().
    // Client-side router.push() won't trigger a re-render with new locale messages.
    const path = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    const query = searchParams.toString();
    window.location.href = query ? `${path}?${query}` : path;
  };

  const currentLabel = locales.find((l) => l.code === currentLocale)?.label || currentLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleChange(locale.code)}
            className={locale.code === currentLocale ? "bg-muted" : ""}
          >
            {locale.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
