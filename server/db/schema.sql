-- HackerSphere Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  username    VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name  VARCHAR(100),
  last_name   VARCHAR(100),
  avatar_url  TEXT,
  bio         TEXT,
  role        VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'instructor')),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACADEMY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                    VARCHAR(255) UNIQUE NOT NULL,
  title                   VARCHAR(500) NOT NULL,
  description             TEXT,
  short_description       TEXT,
  difficulty_level        VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  category                VARCHAR(100),
  estimated_duration_hours NUMERIC(5,1),
  is_featured             BOOLEAN DEFAULT false,
  is_published            BOOLEAN DEFAULT true,
  instructor_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  price                   NUMERIC(10,2) DEFAULT 0,
  thumbnail_url           TEXT,
  preview_video_url       TEXT,
  tags                    TEXT[],
  rating                  NUMERIC(3,2) DEFAULT 0,
  review_count            INTEGER DEFAULT 0,
  enrollment_count        INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           VARCHAR(500) NOT NULL,
  content_blocks  JSONB DEFAULT '[]',
  order_index     INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  is_preview      BOOLEAN DEFAULT false,
  video_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS progress (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id             UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id             UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  completed             BOOLEAN DEFAULT false,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  time_spent_seconds    INTEGER DEFAULT 0,
  last_accessed         TIMESTAMPTZ DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  issued_at        TIMESTAMPTZ DEFAULT NOW(),
  certificate_code VARCHAR(100) UNIQUE,
  UNIQUE(user_id, course_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SHOP
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug             VARCHAR(255) UNIQUE NOT NULL,
  name             VARCHAR(500) NOT NULL,
  description      TEXT,
  short_description TEXT,
  price            NUMERIC(10,2) NOT NULL,
  compare_price    NUMERIC(10,2),
  category         VARCHAR(100),
  category_id      UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  inventory_count  INTEGER DEFAULT 0,
  images           JSONB DEFAULT '[]',
  features         JSONB DEFAULT '[]',
  specifications   JSONB DEFAULT '{}',
  rating           NUMERIC(3,2) DEFAULT 0,
  review_count     INTEGER DEFAULT 0,
  is_featured      BOOLEAN DEFAULT false,
  is_active        BOOLEAN DEFAULT true,
  tags             TEXT[],
  sku              VARCHAR(100) UNIQUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  sku         VARCHAR(100),
  price       NUMERIC(10,2),
  inventory   INTEGER DEFAULT 0,
  attributes  JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(50) UNIQUE NOT NULL,
  description      TEXT,
  discount_type    VARCHAR(20) DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_uses         INTEGER,
  uses_count       INTEGER DEFAULT 0,
  valid_from       TIMESTAMPTZ DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(10,2) DEFAULT 0,
  shipping_cost    NUMERIC(10,2) DEFAULT 0,
  discount_amount  NUMERIC(10,2) DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_code    VARCHAR(50),
  shipping_address JSONB,
  billing_address  JSONB,
  shipping_method  VARCHAR(100),
  tracking_number  VARCHAR(200),
  payment_intent_id VARCHAR(200),
  payment_status   VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  variant_id  UUID REFERENCES product_variants(id),
  name        VARCHAR(500) NOT NULL,
  sku         VARCHAR(100),
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title       VARCHAR(300),
  comment     TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS / TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
