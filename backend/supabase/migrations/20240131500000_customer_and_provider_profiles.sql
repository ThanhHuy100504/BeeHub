-- Create customer_profiles and provider_profiles tables required by backend services and admin dashboard

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY,
  student_id TEXT,
  university TEXT,
  address TEXT,
  city TEXT,
  district TEXT,
  ward TEXT,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  preferred_payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY,
  business_name TEXT,
  business_license TEXT,
  tax_code TEXT,
  vehicle_type TEXT,
  vehicle_capacity TEXT,
  vehicle_plate TEXT,
  vehicle_images TEXT[],
  service_area TEXT[],
  base_price NUMERIC(10,2) DEFAULT 0,
  price_per_km NUMERIC(10,2) DEFAULT 0,
  price_per_floor NUMERIC(10,2) DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_earnings NUMERIC(12,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  verification_status TEXT DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT provider_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT provider_profiles_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id)
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_customer_profiles_updated_at ON customer_profiles;
CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_profiles_updated_at ON provider_profiles;
CREATE TRIGGER update_provider_profiles_updated_at
  BEFORE UPDATE ON provider_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Foreign keys required for PostgREST resource embedding
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_provider_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE SET NULL;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_provider_id_fkey;
ALTER TABLE reviews
  ADD CONSTRAINT reviews_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE;

-- RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read provider profiles" ON provider_profiles;
CREATE POLICY "Public read provider profiles" ON provider_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own provider profile" ON provider_profiles;
CREATE POLICY "Users can update own provider profile" ON provider_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own provider profile" ON provider_profiles;
CREATE POLICY "Users can insert own provider profile" ON provider_profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own customer profile" ON customer_profiles;
CREATE POLICY "Users can view own customer profile" ON customer_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own customer profile" ON customer_profiles;
CREATE POLICY "Users can update own customer profile" ON customer_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own customer profile" ON customer_profiles;
CREATE POLICY "Users can insert own customer profile" ON customer_profiles FOR INSERT WITH CHECK (auth.uid() = id);
