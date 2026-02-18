-- Allow authenticated users to insert (e.g. when submitting the pricing form while logged in)
CREATE POLICY "Allow authenticated insert"
  ON public.marketing_subscribers FOR INSERT
  TO authenticated WITH CHECK (true);
