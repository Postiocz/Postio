-- ============================================================
-- POSTIO – Seed default templates on signup
-- ============================================================

-- Extend the existing handle_new_user trigger to insert default templates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.users (id, full_name, avatar_url, language)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'language', 'cs')
  );

  -- Insert default templates for the new user
  INSERT INTO public.templates (user_id, name, content, is_premium)
  VALUES
    (NEW.id, 'Motivační příspěvek', 'Úspěch není konečný, selhání není fatální. Je to odvaha pokračovat, která počítá. 🚀\n\n#motivace #úspěch #odvaha', false),
    (NEW.id, 'Otázka pro komunitu', 'Jakou výzvu jste právě překonali ve svém projektu? 👇\n\nSdílejte vaše příběhy – inspirujete ostatní!\n\n#komunita #sdílení #růst', false),
    (NEW.id, 'Behind the scenes', 'Zády k fotoaparátu: takhle vypadá tvorba obsahu v Postio ✨\n\n#behindthescenes #tvorba #kreativita', false),
    (NEW.id, 'Tip/Triky', '💡 Tip dne:\n\nPlánujte obsah s předstihem. Jedna hodina plánování ušetří deset hodin improvizace.\n\n#tip #produktivita #plánování', false),
    (NEW.id, 'Product Launch', '🎉 Představujeme [NÁZEV PRODUKTU]!\n\nŘešíme [PROBLÉM] pro [CÍLOVÁ SKUPINA].\n\nZkuste to zdarma na [ODKAZ]\n\n#launch #produkt #inovace', true),
    (NEW.id, 'Weekly Recap', '📊 Týdenní shrnutí:\n\n✅ Co se povedlo\n📝 Co se naučili\n🎯 Co příští týden\n\nSledujte náš růst!\n\n#recap #týden #růst', true);

  -- Insert initial cookie consent (necessary only)
  INSERT INTO public.cookie_consents (user_id, necessary, analytics, marketing)
  VALUES (NEW.id, true, false, false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unique index on cookie_consents.user_id for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS cookie_consents_user_id_unique
  ON public.cookie_consents (user_id);
