# Projekt: Postio (Social Media Content Planner)

## 🛠 Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Backend & Databáze:** Supabase
- **Autentizace:** Supabase Auth (Google OAuth + Email)

## 📐 Pravidla pro Claude Code
1. **Next.js pravidla:** 
   - Používej moderní přístup (Server Components). Pro klientskou interaktivitu nezapomeň na vrchol souboru přidat `"use client"`.
2. **Supabase pravidla:** 
   - Klientské a serverové dotazy dělej přes `@supabase/ssr`. 
   - Nepoužívej staré verze Supabase knihoven.
3. **Pracovní postup:**
   - Než vytvoříš velké množství kódu, nejprve mi napiš krátký plán, co přesně půjdeš udělat.
   - Po úspěšném vyřešení složitého problému si zapiš ponaučení sem dolů do sekce "Ponaučení z chyb".

## 🚀 Časté příkazy
- Start vývojového serveru: `npm run dev` (dostupné na http://localhost:3000)

## 🎨 Standard Postio UI
- **Barevné schéma**: Pure Black (#000) pozadí, Card bg (#09090b s opacitou).
- **Radius**: Všude 20px (`rounded-[20px]`).
- **Efekty**: Glassmorphism, mřížka 24x24px, jemné glow gradienty.
- **Fonty**: Geist/Inter pro texty, stylizované Logo pro branding.
- **Design System Standard**: Pozadí #000, Radius 20px, Glassmorphism, Grid, Barevné logo.

## 🧠 Ponaučení z chyb (Paměť)
- *Zde bude Claude přidávat věci, které jsme už jednou pokazili a opravili, aby se neopakovaly.*