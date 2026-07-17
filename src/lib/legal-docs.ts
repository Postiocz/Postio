import { promises as fs } from "fs";
import path from "path";

/**
 * Reads a legal document (.txt) from the repo's `doc/` directory.
 *
 * Runs on the Node.js runtime (server component). The raw text is returned
 * as-is; structured parsing (headings, bullets, date extraction) is handled
 * by the consumer (see legal-doc-page component / Krok 4 of Prompt 033).
 */
export async function readLegalDoc(fileName: string): Promise<string> {
  const filePath = path.join(process.cwd(), "doc", fileName);
  return fs.readFile(filePath, "utf-8");
}
