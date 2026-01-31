-- Create store_products table
CREATE TABLE public.store_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  disclaimer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
CREATE POLICY "Anyone can view active products"
ON public.store_products FOR SELECT
USING (is_active = true);

-- Block public modifications
CREATE POLICY "Block public insert on store_products"
ON public.store_products FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block public update on store_products"
ON public.store_products FOR UPDATE
USING (false);

CREATE POLICY "Block public delete on store_products"
ON public.store_products FOR DELETE
USING (false);

-- Create orders table
CREATE TABLE public.store_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  telegram_username TEXT,
  instagram_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Block all public access to orders
CREATE POLICY "Block public select on store_orders"
ON public.store_orders FOR SELECT
USING (false);

CREATE POLICY "Block public update on store_orders"
ON public.store_orders FOR UPDATE
USING (false);

CREATE POLICY "Block public delete on store_orders"
ON public.store_orders FOR DELETE
USING (false);

-- Allow public to insert orders (submit orders)
CREATE POLICY "Allow public to submit orders"
ON public.store_orders FOR INSERT
WITH CHECK (true);

-- Create store_stats table for completed orders counter
CREATE TABLE public.store_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read stats
CREATE POLICY "Anyone can read store_stats"
ON public.store_stats FOR SELECT
USING (true);

-- Block public modifications
CREATE POLICY "Block public insert on store_stats"
ON public.store_stats FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block public update on store_stats"
ON public.store_stats FOR UPDATE
USING (false);

CREATE POLICY "Block public delete on store_stats"
ON public.store_stats FOR DELETE
USING (false);

-- Insert initial completed orders count (starting from 2)
INSERT INTO public.store_stats (key, value) VALUES ('completed_orders', 2);

-- Insert the Xbox Game Pass product
INSERT INTO public.store_products (name, description, image_url, disclaimer, is_active, display_order)
VALUES (
  'Xbox Game Pass Ultimate – 1 Month',
  'اشتراك كامل لمدة شهر (Premium).
في حال كان الحساب مشتركاً أو مفعلاً سابقاً، لا يعمل الاشتراك عليه.
في حال التفعيل على حسابك الشخصي وكان غير مشترك سابقاً، يتم التفعيل مع إضافة 1000 دينار على السعر.
يمكن توفير حساب جديد من المتجر ويتم إرساله للزبون.',
  NULL,
  'هذا المنتج رقمي ولا يمكن استرجاعه بعد التفعيل.',
  true,
  0
);