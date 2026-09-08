BEGIN;

-- Preserve public.products and existing rows. These columns are additive only.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS original_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fabric text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS color_hex text NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS occasion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS craft_details text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS care_instructions text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS available_sizes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS size_chart jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS in_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_best_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_customizable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating numeric(3, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customization_base_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text NOT NULL UNIQUE,
  order_date timestamptz NOT NULL DEFAULT timezone('utc', now()),
  customer jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discount numeric(12, 2) NOT NULL DEFAULT 0,
  coupon_code text,
  shipping_fee numeric(12, 2) NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'Pending',
  order_status text NOT NULL DEFAULT 'Order Placed',
  tracking_number text,
  courier_partner text,
  estimated_delivery date,
  whatsapp_updates boolean NOT NULL DEFAULT false,
  notes text,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_size text NOT NULL DEFAULT 'Free Size',
  selected_color text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_customized boolean NOT NULL DEFAULT false,
  customization jsonb,
  customization_fee numeric(12, 2) NOT NULL DEFAULT 0,
  item_total numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.bespoke_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  request_number text NOT NULL UNIQUE,
  customer_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  fabric_preference text NOT NULL DEFAULT '',
  budget_range text NOT NULL DEFAULT '',
  target_date date,
  description text NOT NULL DEFAULT '',
  reference_images text[] NOT NULL DEFAULT '{}',
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  customization jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'New Request',
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT '',
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  location text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Add the application contract to pre-existing tables without replacing data.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS address jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS order_date timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS customer jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS shipping_fee numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS order_status text NOT NULL DEFAULT 'Order Placed',
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS courier_partner text,
  ADD COLUMN IF NOT EXISTS estimated_delivery date,
  ADD COLUMN IF NOT EXISTS whatsapp_updates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_size text NOT NULL DEFAULT 'Free Size',
  ADD COLUMN IF NOT EXISTS selected_color text,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_customized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customization jsonb,
  ADD COLUMN IF NOT EXISTS customization_fee numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_total numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.bespoke_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_number text,
  ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fabric_preference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS budget_range text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customization jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'New Request',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.wishlist
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS products_active_idx ON public.products (is_active);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS bespoke_requests_user_id_idx ON public.bespoke_requests (user_id);
CREATE INDEX IF NOT EXISTS bespoke_requests_status_idx ON public.bespoke_requests (status);
CREATE INDEX IF NOT EXISTS wishlist_user_id_idx ON public.wishlist (user_id);
CREATE INDEX IF NOT EXISTS wishlist_product_id_idx ON public.wishlist (product_id);
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews (user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS user_profiles_set_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS bespoke_requests_set_updated_at ON public.bespoke_requests;
CREATE TRIGGER bespoke_requests_set_updated_at
BEFORE UPDATE ON public.bespoke_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bespoke_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_public_read ON public.products;
DROP POLICY IF EXISTS products_admin_insert ON public.products;
DROP POLICY IF EXISTS products_admin_update ON public.products;
DROP POLICY IF EXISTS products_admin_delete ON public.products;
CREATE POLICY products_public_read ON public.products
FOR SELECT TO anon, authenticated
USING (is_active = true OR public.is_admin());
CREATE POLICY products_admin_insert ON public.products
FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY products_admin_update ON public.products
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY products_admin_delete ON public.products
FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS admin_users_self_read ON public.admin_users;
CREATE POLICY admin_users_self_read ON public.admin_users
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_profiles_own_read ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_own_insert ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_own_update ON public.user_profiles;
CREATE POLICY user_profiles_own_read ON public.user_profiles
FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY user_profiles_own_insert ON public.user_profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY user_profiles_own_update ON public.user_profiles
FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS orders_own_read ON public.orders;
DROP POLICY IF EXISTS orders_own_insert ON public.orders;
DROP POLICY IF EXISTS orders_admin_all ON public.orders;
CREATE POLICY orders_own_read ON public.orders
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY orders_own_insert ON public.orders
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY orders_admin_all ON public.orders
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS order_items_own_read ON public.order_items;
DROP POLICY IF EXISTS order_items_own_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_admin_all ON public.order_items;
CREATE POLICY order_items_own_read ON public.order_items
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
);
CREATE POLICY order_items_own_insert ON public.order_items
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR o.user_id IS NULL))
);
CREATE POLICY order_items_admin_all ON public.order_items
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS bespoke_own_read ON public.bespoke_requests;
DROP POLICY IF EXISTS bespoke_own_insert ON public.bespoke_requests;
DROP POLICY IF EXISTS bespoke_own_update ON public.bespoke_requests;
DROP POLICY IF EXISTS bespoke_admin_all ON public.bespoke_requests;
CREATE POLICY bespoke_own_read ON public.bespoke_requests
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY bespoke_own_insert ON public.bespoke_requests
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY bespoke_own_update ON public.bespoke_requests
FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY bespoke_admin_all ON public.bespoke_requests
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS wishlist_own_read ON public.wishlist;
DROP POLICY IF EXISTS wishlist_own_insert ON public.wishlist;
DROP POLICY IF EXISTS wishlist_own_delete ON public.wishlist;
CREATE POLICY wishlist_own_read ON public.wishlist
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY wishlist_own_insert ON public.wishlist
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY wishlist_own_delete ON public.wishlist
FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
DROP POLICY IF EXISTS reviews_own_insert ON public.reviews;
DROP POLICY IF EXISTS reviews_admin_all ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reviews_own_insert ON public.reviews
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_admin_all ON public.reviews
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bespoke_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.admin_users TO authenticated;

COMMIT;
