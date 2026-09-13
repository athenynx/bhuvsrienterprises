BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_sizes boolean,
  ADD COLUMN IF NOT EXISTS has_colors boolean,
  ADD COLUMN IF NOT EXISTS size_chart_enabled boolean;

UPDATE public.products
SET has_sizes = COALESCE(has_sizes, cardinality(available_sizes) > 0),
  has_colors = COALESCE(has_colors, jsonb_array_length(COALESCE(color_variants, '[]'::jsonb)) > 0),
    size_chart_enabled = COALESCE(size_chart_enabled, custom_size_chart IS NOT NULL)
WHERE has_sizes IS NULL OR has_colors IS NULL OR size_chart_enabled IS NULL;

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
  requested_color text;
  requested_quantity integer;
  unit_price numeric;
  expected_item_total numeric;
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
    IF COALESCE(product_row.has_sizes, cardinality(product_row.available_sizes) > 0) THEN
      SELECT * INTO size_row FROM public.product_sizes WHERE product_id = product_row.id AND lower(size_name) = lower(COALESCE(requested_size, '')) FOR UPDATE;
      IF NOT FOUND OR NOT size_row.is_available THEN RAISE EXCEPTION 'Selected size is unavailable'; END IF;
      IF size_row.stock_count < requested_quantity THEN RAISE EXCEPTION 'Selected size is out of stock'; END IF;
      UPDATE public.product_sizes SET stock_count = stock_count - requested_quantity, updated_at = timezone('utc', now()) WHERE id = size_row.id;
    ELSE
      IF COALESCE(product_row.stock_count, 0) < requested_quantity OR NOT product_row.in_stock THEN RAISE EXCEPTION 'Product is out of stock'; END IF;
      UPDATE public.products SET stock_count = stock_count - requested_quantity, in_stock = stock_count - requested_quantity > 0 WHERE id = product_row.id;
    END IF;

    requested_color := NULLIF(trim(item->>'selected_color'), '');
    IF COALESCE(product_row.has_colors, jsonb_array_length(COALESCE(product_row.color_variants, '[]'::jsonb)) > 0) THEN
      IF requested_color IS NULL OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(product_row.color_variants, '[]'::jsonb)) variant
        WHERE lower(variant->>'name') = lower(requested_color)
      ) THEN RAISE EXCEPTION 'Selected colour is unavailable'; END IF;
    END IF;

    unit_price := product_row.price + COALESCE((item->>'customization_fee')::numeric, 0);
    expected_item_total := unit_price * requested_quantity;
    IF abs(COALESCE((item->>'item_total')::numeric, 0) - expected_item_total) > 0.01 THEN RAISE EXCEPTION 'Invalid item price'; END IF;

    INSERT INTO public.order_items (order_id, product_id, product_snapshot, selected_size, selected_color, quantity, is_customized, customization, customization_fee, item_total)
    VALUES (order_row.id, product_row.id, jsonb_build_object('id', product_row.id, 'name', product_row.name, 'price', product_row.price, 'images', product_row.images, 'sku', product_row.sku), COALESCE(requested_size, 'Free Size'), requested_color, requested_quantity, COALESCE((item->>'is_customized')::boolean, false), item->'customization', COALESCE((item->>'customization_fee')::numeric, 0), expected_item_total);
  END LOOP;
  RETURN order_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(jsonb, jsonb) TO anon, authenticated;
COMMIT;
