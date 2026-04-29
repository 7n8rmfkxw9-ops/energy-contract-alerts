-- Defense in depth: a RESTRICTIVE policy is AND-combined with permissive ones.
-- This guarantees that NO write to user_roles can ever succeed for a non-admin,
-- even if another policy were accidentally added later.
CREATE POLICY "Block non-admin writes on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));