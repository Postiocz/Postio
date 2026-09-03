-- ============================================================
-- POSTIO – Anti-abuse: registration_logs
-- ============================================================
-- Tracks the IP address behind each new account so we can throttle
-- mass signups from a single network (referral-reward abuse) and, at
-- the same time, keep legit shared networks (household/office NAT)
-- usable. Only the service-role client writes/reads it; users never
-- touch these rows, so no RLS policy is needed.

CREATE TABLE IF NOT EXISTS public.registration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup of "how many accounts came from this IP in the window".
CREATE INDEX IF NOT EXISTS registration_logs_ip_created_idx
  ON public.registration_logs (ip_address, created_at);

ALTER TABLE public.registration_logs ENABLE ROW LEVEL SECURITY;
