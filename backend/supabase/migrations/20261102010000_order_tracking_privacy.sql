BEGIN;
CREATE INDEX IF NOT EXISTS idx_provider_locations_order_provider_recent
  ON public.provider_locations (current_order_id, provider_id, created_at DESC);
DROP POLICY IF EXISTS "Provider locations viewable by customers with active orders" ON public.provider_locations;
CREATE POLICY "Provider locations viewable by customers with active orders"
  ON public.provider_locations FOR SELECT USING (
    auth.uid() = provider_id OR (
      is_online = true AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = provider_locations.current_order_id
          AND o.provider_id = provider_locations.provider_id
          AND o.customer_id = auth.uid()
          AND o.status::text IN ('accepted', 'scheduled', 'picking_up', 'picked_up', 'in_progress', 'delivering')
      )
    )
  );
DROP POLICY IF EXISTS "Providers can insert own location" ON public.provider_locations;
CREATE POLICY "Providers can insert own location" ON public.provider_locations FOR INSERT WITH CHECK (
  auth.uid() = provider_id AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = provider_locations.current_order_id
      AND o.provider_id = auth.uid()
      AND o.status::text IN ('accepted', 'scheduled', 'picking_up', 'picked_up', 'in_progress', 'delivering')
  )
);
DROP POLICY IF EXISTS "Providers can update own location" ON public.provider_locations;
CREATE POLICY "Providers can update own location" ON public.provider_locations FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id AND EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = provider_locations.current_order_id AND o.provider_id = auth.uid()
  ));
COMMIT;
