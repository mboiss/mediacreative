-- Schema Migration Script for Supabase PostgreSQL Database

-- 1. MODEMS TABLE
CREATE TABLE IF NOT EXISTS public.modems (
  id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  number TEXT NOT NULL,
  ssid TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Available',
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TOUR RENTAL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.tour_rental_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tourcode TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  qty INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  tl TEXT,
  status TEXT NOT NULL DEFAULT 'Upcoming',
  modems TEXT,
  invoice_status TEXT NOT NULL DEFAULT 'Unpaid',
  remark TEXT,
  notes TEXT,
  device_pax JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TOUR LEADERS TABLE
CREATE TABLE IF NOT EXISTS public.tour_leaders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ESIM PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.esim_profiles (
  id TEXT PRIMARY KEY,
  iccid TEXT NOT NULL,
  package_name TEXT NOT NULL,
  region TEXT NOT NULL,
  data_gb NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  user_name TEXT,
  activation_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  expiry_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PAYMENT ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  invoice_prefix TEXT,
  tax_rate TEXT,
  currency TEXT,
  payment_terms_days TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

