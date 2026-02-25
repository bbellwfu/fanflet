-- Allow authenticated users to insert (e.g. when submitting the pricing form while logged in)
-- Idempotent: safe to run if policy already exists
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.marketing_subscribers;
CREATE POLICY "Allow authenticated insert"
  ON public.marketing_subscribers FOR INSERT
  TO authenticated WITH CHECK (true);
