BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS custom_size_chart jsonb;

CREATE TABLE IF NOT EXISTS public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_name text NOT NULL,
  stock_count integer NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (product_id, size_name)
);

CREATE TABLE IF NOT EXISTS public.size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'cm',
  measurement_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.product_size_charts (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  size_chart_id uuid NOT NULL REFERENCES public.size_charts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS product_sizes_product_id_idx ON public.product_sizes(product_id);
CREATE INDEX IF NOT EXISTS product_size_charts_chart_id_idx ON public.product_size_charts(size_chart_id);

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_size_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_sizes_public_read ON public.product_sizes;
CREATE POLICY product_sizes_public_read ON public.product_sizes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_sizes_admin_write ON public.product_sizes;
CREATE POLICY product_sizes_admin_write ON public.product_sizes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS size_charts_public_read ON public.size_charts;
CREATE POLICY size_charts_public_read ON public.size_charts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS size_charts_admin_write ON public.size_charts;
CREATE POLICY size_charts_admin_write ON public.size_charts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS product_size_charts_public_read ON public.product_size_charts;
CREATE POLICY product_size_charts_public_read ON public.product_size_charts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS product_size_charts_admin_write ON public.product_size_charts;
CREATE POLICY product_size_charts_admin_write ON public.product_size_charts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.product_sizes, public.size_charts, public.product_size_charts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_sizes, public.size_charts, public.product_size_charts TO authenticated;

CREATE OR REPLACE FUNCTION public.create_order_with_inventory(p_order jsonb, p_items jsonb)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.orders;
  item jsonb;
  product_row public.products;
  size_row public.product_sizes;
  requested_size text;
  requested_quantity integer;
BEGIN
  INSERT INTO public.orders (
    user_id, order_number, order_date, customer, subtotal, discount, coupon_code,
    shipping_fee, total_amount, payment_method, payment_status, order_status,
    tracking_number, courier_partner, estimated_delivery, whatsapp_updates, notes, timeline
  ) VALUES (
    NULLIF(p_order->>'user_id', '')::uuid, p_order->>'order_number', COALESCE((p_order->>'order_date')::timestamptz, timezone('utc', now())),
    COALESCE(p_order->'customer', '{}'::jsonb), COALESCE((p_order->>'subtotal')::numeric, 0), COALESCE((p_order->>'discount')::numeric, 0), NULLIF(p_order->>'coupon_code', ''),
    COALESCE((p_order->>'shipping_fee')::numeric, 0), COALESCE((p_order->>'total_amount')::numeric, 0), COALESCE(p_order->>'payment_method', 'cod'), COALESCE(p_order->>'payment_status', 'Pending'), COALESCE(p_order->>'order_status', 'Order Placed'),
    NULLIF(p_order->>'tracking_number', ''), NULLIF(p_order->>'courier_partner', ''), NULLIF(p_order->>'estimated_delivery', '')::date, COALESCE((p_order->>'whatsapp_updates')::boolean, false), NULLIF(p_order->>'notes', ''), COALESCE(p_order->'timeline', '[]'::jsonb)
  ) RETURNING * INTO order_row;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    requested_quantity := (item->>'quantity')::integer;
    IF requested_quantity IS NULL OR requested_quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO product_row FROM public.products WHERE id = (item->>'product_id')::uuid AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product is unavailable'; END IF;
    requested_size := NULLIF(trim(item->>'selected_size'), '');
    IF EXISTS (SELECT 1 FROM public.product_sizes WHERE product_id = product_row.id) THEN
      SELECT * INTO size_row FROM public.product_sizes WHERE product_id = product_row.id AND lower(size_name) = lower(COALESCE(requested_size, '')) FOR UPDATE;
      IF NOT FOUND OR NOT size_row.is_available THEN RAISE EXCEPTION 'Selected size is unavailable'; END IF;
      IF size_row.stock_count < requested_quantity THEN RAISE EXCEPTION 'Selected size is out of stock'; END IF;
      UPDATE public.product_sizes SET stock_count = stock_count - requested_quantity, updated_at = timezone('utc', now()) WHERE id = size_row.id;
    ELSE
      IF COALESCE(product_row.stock_count, 0) < requested_quantity OR NOT product_row.in_stock THEN RAISE EXCEPTION 'Product is out of stock'; END IF;
      UPDATE public.products SET stock_count = stock_count - requested_quantity, in_stock = stock_count - requested_quantity > 0 WHERE id = product_row.id;
    END IF;
    INSERT INTO public.order_items (order_id, product_id, product_snapshot, selected_size, selected_color, quantity, is_customized, customization, customization_fee, item_total)
    VALUES (order_row.id, product_row.id, COALESCE(item->'product_snapshot', '{}'::jsonb), COALESCE(requested_size, 'Free Size'), NULLIF(item->>'selected_color', ''), requested_quantity, COALESCE((item->>'is_customized')::boolean, false), item->'customization', COALESCE((item->>'customization_fee')::numeric, 0), COALESCE((item->>'item_total')::numeric, 0));
  END LOOP;
  RETURN order_row;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(jsonb, jsonb) TO anon, authenticated;
COMMIT;