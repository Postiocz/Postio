import re

with open('CHANGELOG.md', 'r', encoding='utf-8') as f:
    content = f.read()

new_log = """## 2026-06-12

### COMPLETED: Etapa 4 – Úklid (Clean up starých sloupců a fallbacků)
- **Cíl**: Dokončit migraci na tabulku `post_platforms` smazáním starých sloupců z tabulky `posts` a odstraněním fallbacků z UI. Aplikace nyní 100% důvěřuje `post_platforms`.
- **Provedené změny**:
  - `supabase/migrations/025_cleanup_posts_table.sql`: Vytvořena migrace, která odstranila zastaralé RPC funkce a dropnula sloupce (`platforms`, `status`, `scheduled_at`, `published_at`, `published_platforms`, `external_id`, `external_ids`, `publish_error`, `removed_at`, `removed_from_platform`, `last_sync_at`) z tabulky `posts`.
  - `src/lib/supabase/types.ts`: Aktualizovány TypeScript typy pro tabulku `posts` (odstraněny smazané sloupce).
  - `src/lib/actions/posts.ts`:
    - Odstraněn dual-write při vytváření/upravování postů (nyní se modifikuje pouze content/media/tags atd.).
    - Přepracovány funkce `deletePost`, `syncPostStatus`, `resetPostStatus`, a `syncPublishedPosts` tak, aby četly a aktualizovaly data pouze z `post_platforms`.
    - `getPosts` a `getPost` nyní počítají agregovaný `status` a `platforms` pole dynamicky z joinnutých `post_platforms`, aby UI komponenty mohly dál používat agregovaný stav pro filtry, ale bez potřeby fallbacků do starých sloupců.
  - `src/lib/actions/publish.ts`: Odstraněn veškerý kód, který aktualizoval `posts` ohledně publikování. Nyní se stav a ID ukládají POUZE do `post_platforms`.
  - `src/components/dashboard/delete-post-dialog.tsx`: Komponenta pro smazání byla přepracována tak, aby brala dostupné sítě výhradně z `post_platforms`.
  - `src/components/edit-post-dialog.tsx` a `_post-card.tsx` a kalendář: Fallbacky z UI odstraněny; ikony, checkboxy a status bar nyní spoléhají plně na `post_platforms`.

"""

content = content.replace("## 2026-06-12\n\n### COMPLETED: Etapa 1", new_log + "### COMPLETED: Etapa 1")

with open('CHANGELOG.md', 'w', encoding='utf-8') as f:
    f.write(content)
