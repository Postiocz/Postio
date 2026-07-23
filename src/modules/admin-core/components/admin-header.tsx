"use client";

import { Search } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl px-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search users..."
          className="h-9 w-64 rounded-[20px] border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <LocaleSwitcher isAdmin={true} />
        <ThemeToggle />
      </div>
    </header>
  );
}
