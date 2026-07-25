-- ============================================================
-- POSTIO – Feedback Table (Prompt 044-REVISED KROK 4.1)
-- ============================================================
-- Tabulka pro ukládání zpětné vazby od uživatelů.
-- Uživatelé mohou nahlásit bug, navrhnout feature nebo poslat obecnou zprávu.
-- Admin má přehled všech feedbacků na /admin/feedback.
-- ============================================================

-- Vytvoř tabulku feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('bug', 'feature', 'other')),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Zapni RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS politiky
-- ============================================================

-- Uživatelé mohou vkládat vlastní feedback
CREATE POLICY "Users can insert their own feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin může číst všechny feedbacky
CREATE POLICY "Admins can view all feedback"
  ON public.feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin může měnit status feedbacku
CREATE POLICY "Admins can update feedback status"
  ON public.feedback FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Indexy pro výkon
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_type_idx ON public.feedback(type);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON public.feedback(status);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback(created_at DESC);
