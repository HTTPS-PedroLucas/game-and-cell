CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS brands (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  category_slug text NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  brand text NOT NULL REFERENCES brands(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  price numeric(12, 2) NOT NULL CHECK (price > 0),
  old_price numeric(12, 2) CHECK (old_price IS NULL OR old_price >= 0),
  installments integer NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 24),
  availability text NOT NULL DEFAULT 'estoque' CHECK (availability IN ('estoque', 'encomenda')),
  featured boolean NOT NULL DEFAULT false,
  image_url text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  specs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(specs) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_slug);
CREATE INDEX IF NOT EXISTS products_slug_idx ON products(slug);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products(featured) WHERE featured = true;

CREATE TABLE IF NOT EXISTS services (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  turnaround text NOT NULL,
  warranty text NOT NULL,
  price_range text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  game text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  event_time text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  entry_fee text NOT NULL DEFAULT '',
  prize text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('aberto', 'encerrado', 'rascunho')),
  champion text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rules) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  body text NOT NULL,
  photo_url text NOT NULL DEFAULT '',
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id bigserial PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('orcamento', 'inscricao')),
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'atendido', 'perdido')),
  name text NOT NULL,
  phone text NOT NULL,
  device text,
  problem text,
  nickname text,
  tournament_id bigint REFERENCES tournaments(id) ON DELETE SET NULL,
  tournament_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_type_created_idx ON leads(type, created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
