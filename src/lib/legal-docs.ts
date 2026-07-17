import { promises as fs } from "fs";
import path from "path";

/**
 * Reads a legal document (.txt) from the repo's `doc/` directory.
 *
 * Runs on the Node.js runtime (server component). Locale resolution:
 *  - `cs` (or any locale without a translation) reads `doc/<fileName>`;
 *  - `en`/`uk` first try `doc/<locale>/<fileName>`, falling back to the `cs`
 *    source when a translation is missing.
 * Structured parsing (headings, bullets, date) is handled by the consumer.
 */
export async function readLegalDoc(
  fileName: string,
  locale = "cs",
): Promise<string> {
  const dirs = locale === "cs" ? ["doc"] : [`doc/${locale}`, "doc"];

  for (const dir of dirs) {
    try {
      return await fs.readFile(path.join(process.cwd(), dir, fileName), "utf-8");
    } catch {
      // not found in this directory, try the next candidate
    }
  }

  // Should not happen: the `cs` source always exists.
  throw new Error(`Legal document not found: ${fileName} (locale: ${locale})`);
}
