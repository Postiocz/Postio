# Postio – Pracovní plány

## ⚠️ STRIKTNÍ PRAVIDLA SPOLUPRÁCE (Nejvyšší priorita)

1. **VÝBĚR ÚKOLU A DOPORUČENÍ:**
   Před zahájením jakékoliv práce se mě VŽDY zeptej, kterým konkrétním krokem z plánu v `ukol.md` chceme začít. Ke své otázce vždy připoj stručné doporučení, který krok je teď nejlogičtější a proč.

2. **JEDEN KROK AT A TIME (Krokování):**
   Vždy proveď POUZE ten jeden vybraný nebo schválený krok. Jakmile daný krok naprogramuješ, OKAMŽITĚ ZASTAV PRÁCI, nepokračuj na další bod a zeptej se mě, jak chceme pokračovat. Nikdy nedělej více kroků najednou!

3. **TESTOVÁNÍ PŘED ZÁPISEM:**
   Po dokončení kroku vždy vyčkej na mé manuální otestování v prohlížeči/aplikaci. Teprve až ti výslovně napíšu, že je krok otestovaný a funkční, provedeš tyto dvě administrativní věci:
   - Označíš daný krok v `ukol.md` jako hotový (např. odškrtnutím [x] nebo ✅).
   - Zepíšeš stručný záznam o této změně do souboru `CHANGELOG.md`.
   (Dříve než po mém schválení do těchto souborů stav nedopisuj!)

4. **GIT COMMIT (Automaticky po schválení Kroku 3):**
   Jakmile dokončíš Krok 3 (vše je otestované, ✅ v `ukol.md`, záznam v `CHANGELOG.md`), **automaticky sám provedeš `git add` + `git commit`** aktuálního stavu. Tím se trvale zachová i případný záznam, který v budoucnu propadne prořezáním `CHANGELOG.md` (Pravidlo 6) – historie zůstává v Gitu a nic se neztratí. Po commitu se zastav a zeptej se mě, jak chceme pokračovat (dle Pravidla 2). **Neprováděj `git push`** – ten dělá výhradně uživatel sám.

5. **ÚSPORA KONTEXTU A LIMIT 81 920 TOKENŮ:**
   Pracujeme s lokálním modelem a máme tvrdý limit kontextového okna. Pro ochranu před přehlcením paměti:
   - Buď ve svých odpovědích maximálně věcný a stručný (žádné dlouhé úvahy okolo, rovnou ukaž kód nebo položenou otázku).
   - Nečti zbytečně celé obří soubory, pokud v nich potřebuješ najít jen jednu funkci – používej cílené vyhledávání nebo čti jen relevantní řádky.
   - Udržuj kontext čistý: po dokončení kroku se soustřeď výhradně na aktuální bod z `ukol.md` a netahej do paměti starý kód z již hotových částí, pokud to není nezbytně nutně nutné.

6. **AUTOMATICKÉ PROŘEZÁVÁNÍ CHANGELOGU (Zero-Token Auto-Drop):**
   Soubor `CHANGELOG.md` smí obsahovat STRIKTNĚ MAXIMÁLNĚ 10 nejnovějších časových záznamů/milníků. Pokaždé, když po manuálním schválení uživatelem (Pravidlo 3) zapíšeš nový záznam na začátek `CHANGELOG.md`, zkontroluješ celkový počet záznamů v tomto souboru. Pokud přidáním nového záznamu celkový počet překročí 10, ten úplně nejstarší záznam ze dna `CHANGELOG.md` JEDNODUŠE SMAŽ (odstraň ze souboru). Žádný archivní soubor neotevírej, nečti ani nevytvářej – stará historie zůstává trvale v Gitu (zachráněna committem v Kroku 4) a my tímto šetříme 100 % kontextových tokenů pro programování.

7. **MAZÁNÍ KOMPLETNĚ HOTOVÝCH ÚKOLŮ:**
   Jakmile jsou VŠECHNY kroky daného úkolu označeny jako ✅ A byl proveden `git commit` (Pravidlo 4), smaž celou sekci tohoto úkolu z `ukol.md`. Ponechej pouze striktní pravidla (tato sekce). Po smazání vypíšeš: **"Všechny úkoly jsou hotové, s čím chceš pokračovat?"**

---

## Oprava – Zapomenuté heslo

> **Problém:** Tlačítko "Zapomněli jste heslo?" v `email-signin.tsx` (ř. 124–129) je mrtvé – nemá `onClick`. Celý flow pro reset hesla přes Supabase chybí.

### Analýza aktuálního stavu

- `src/lib/actions/auth.ts` – existuje `emailAuthAction` + `logoutAction`. Chybí `resetPasswordAction` a `updatePasswordAction`.
- `src/components/auth/email-signin.tsx` – `mode: "signin" | "signup"`. Tlačítko "Zapomněli jste heslo?" (ř. 124) nemá handler.
- `src/app/auth/callback/route.ts` – zpracovává OAuth a email verify. Recovery typ (`?type=recovery`) není explicitně ošetřen – Supabase v tomto callbacku vymění kód za session, ale redirect vede na `/accounts`, nikoli na reset stránku.
- i18n: existuje `forgotPassword: "Zapomněli jste heslo?"`. Chybí klíče pro formulář resetu a novou stránku.

### Plán implementace – Checklist

#### Krok 1: i18n klíče ve všech 3 jazycích
- **Soubory:** `src/messages/cs.json`, `en.json`, `uk.json`
- **Nové klíče (auth namespace):**
  - `forgotPasswordTitle` – "Zapomenuté heslo" / "Forgot password" / "Забутий пароль"
  - `forgotPasswordDescription` – "Zadejte svůj e-mail a zašleme vám odkaz pro reset hesla." / "Enter your email and we'll send you a password reset link." / "Введіть свій e-mail і ми надішлемо вам посилання для скидання пароля."
  - `sendResetLink` – "Odeslat odkaz" / "Send reset link" / "Надіслати посилання"
  - `sendingResetLink` – "Odesílám..." / "Sending..." / "Надсилаю..."
  - `resetEmailSent` – "Odkaz pro reset hesla byl odeslán. Zkontrolujte svůj e-mail." / "Password reset link sent. Check your email." / "Посилання для скидання надіслано. Перевірте пошту."
  - `backToSignIn` – "Zpět na přihlášení" / "Back to sign in" / "Назад до входу"
  - `resetPasswordTitle` – "Nastavit nové heslo" / "Set new password" / "Встановити новий пароль"
  - `newPassword` – "Nové heslo" / "New password" / "Новий пароль"
  - `confirmNewPassword` – "Potvrzení nového hesla" / "Confirm new password" / "Підтвердження нового пароля"
  - `passwordsDoNotMatch` – "Hesla se neshodují." / "Passwords do not match." / "Паролі не збігаються."
  - `passwordTooShort` – "Heslo musí mít alespoň 6 znaků." / "Password must be at least 6 characters." / "Пароль має бути щонайменше 6 символів."
  - `passwordUpdated` – "Heslo bylo úspěšně změněno. Nyní se můžete přihlásit." / "Password updated successfully. You can now sign in." / "Пароль успішно змінено. Тепер ви можете увійти."
  - `passwordUpdateError` – "Při změně hesla nastala chyba. Zkuste znovu." / "Failed to update password. Please try again." / "Помилка при зміні пароля. Спробуйте ще раз."
- **Ověření:** `node -e "JSON.parse(...)"` pro cs/en/uk ✅

#### Krok 2: Server action `resetPasswordAction` v `auth.ts`
- **Soubor:** `src/lib/actions/auth.ts`
- **Přidat:**
  ```ts
  type ResetPasswordState = {
    errorKey: "resetError" | null;
    errorMessage: string | null;
    successKey: "resetEmailSent" | null;
  };
  export async function resetPasswordAction(
    _prevState: ResetPasswordState,
    formData: FormData
  ): Promise<ResetPasswordState>
  ```
- **Logika:** Přečíst `email` z FormData, sestavit `baseUrl` (stejný pattern jako `emailAuthAction`), zavolat `supabase.auth.resetPasswordForEmail(email, { redirectTo: baseUrl + '/auth/callback?type=recovery&next=/' + locale + '/login/reset-password' })`.
- **Ověření:** `npx tsc --noEmit` ✅

#### Krok 3: Server action `updatePasswordAction` v `auth.ts`
- **Soubor:** `src/lib/actions/auth.ts`
- **Přidat:**
  ```ts
  type UpdatePasswordState = {
    errorKey: "passwordsDoNotMatch" | "passwordTooShort" | "passwordUpdateError" | null;
    successKey: "passwordUpdated" | null;
  };
  export async function updatePasswordAction(
    _prevState: UpdatePasswordState,
    formData: FormData
  ): Promise<UpdatePasswordState>
  ```
- **Logika:** Přečíst `password` + `confirmPassword`, validovat délku ≥ 6 a shodu, zavolat `supabase.auth.updateUser({ password })`, po úspěchu redirect na `/{locale}/login`.
- **Ověření:** `npx tsc --noEmit` ✅

#### Krok 4: Reset password page
- **Soubor:** `src/app/[locale]/(auth)/login/reset-password/page.tsx` (nový)
- **Komponenta:** Client component s formulářem — 2 inputy (nové heslo + potvrzení), submit tlačítko volající `updatePasswordAction` přes `useActionState`.
- **Design:** Stejný styl jako login page (glassmorphism card, rounded-[20px], indigo accent).
- **Ověření:** `npx tsc --noEmit` ✅ + manuální test celého flow (email → odkaz → nová stránka → změna hesla → přihlášení)

#### ✅ Krok 5: Auth callback – handling recovery
- **Soubor:** `src/app/auth/callback/route.ts`
- **Změna:** Před existující `GET` handler přidat check: pokud `requestUrl.searchParams.get("type") === "recovery"`, po `exchangeCodeForSession` přesměrovat na `/{locale}/login/reset-password` (místo defaultního `/accounts`).
- **Ověření:** `npx tsc --noEmit` ✅

#### Krok 6: UI v `email-signin.tsx` – mode `"forgot"`
- **Soubor:** `src/components/auth/email-signin.tsx`
- **Změny:**
  - Rozšířit `type Mode = "signin" | "signup" | "forgot"`
  - Přidat `useActionState(resetPasswordAction, ...)` pro forgot flow
  - Tlačítko "Zapomněli jste heslo?" → `onClick={() => setMode("forgot")}`
  - Při `mode === "forgot"`: nový formulář s email inputem + "Odeslat odkaz" tlačítkem + "Zpět na přihlášení" link
  - Po úspěchu (`successKey === "resetEmailSent"`) zobrazit success message
- **Ověření:** Manuální test – kliknutí na "Zapomněli jste heslo?" přepne view, zadání emailu odešle odkaz, zobrazí se success zpráva ✅

### Pořadí implementace

| Krok | Soubory | Popis |
|------|---------|-------|
| ✅ **Krok 1** | `cs.json`, `en.json`, `uk.json` | Přidat i18n klíče pro celý reset flow |
| ✅ **Krok 2** | `src/lib/actions/auth.ts` | Server action `resetPasswordAction` (odeslání reset emailu) |
| ✅ **Krok 3** | `src/lib/actions/auth.ts` | Server action `updatePasswordAction` (nastavení nového hesla) |
| ✅ **Krok 4** | `src/app/[locale]/(auth)/login/reset-password/page.tsx` | Nová stránka "Nastavit nové heslo" |
| ✅ **Krok 5** | `src/app/auth/callback/route.ts` | Přidat recovery redirect do auth callbacku |
| ⬜ **Krok 6** | `src/components/auth/email-signin.tsx` | Aktivovat tlačítko + forgot mode UI |

### Rizika a poznámky

- **Supabase resetPasswordForEmail** posílá email s magic linkem. Ten jde na `/auth/callback?code=...&type=recovery`. Supabase `exchangeCodeForSession` v callbacku vymění code za session a teprve pak můžeme volat `updateUser`. Proto musí být uživatel v session před `updatePasswordAction`.
- **NEZMĚNÍME:** Stávající `emailAuthAction`, `logoutAction`, signup/login flow, žádné jiné stránky.
- **Testování:** Celý flow (email → odkaz → nová stránka → heslo změněno → přihlášení) manuálně ověřit po Kroku 6.
