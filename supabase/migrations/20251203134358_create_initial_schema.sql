-- Initial database schema for Google Maps Scraper
--
-- 1. Tables
--    - scraping_sessions: tracks scraping sessions
--    - listings: stores raw scraped data
--    - processed_listings: stores verified and deduplicated data
--
-- 2. Security
--    - Enable RLS on all tables
--    - Add public access policies (no auth required for MVP)

-- Create scraping_sessions table
CREATE TABLE IF NOT EXISTS scraping_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type text NOT NULL,
  location text NOT NULL,
  status text DEFAULT 'running',
  total_records integer DEFAULT 0,
  processing_status text DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create listings table (raw scraped data)
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  rating numeric,
  website text,
  raw_website text,
  address text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create processed_listings table (verified and deduplicated)
CREATE TABLE IF NOT EXISTS processed_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  rating numeric,
  website text,
  address text,
  phone text,
  is_website_verified boolean DEFAULT false,
  website_status_code integer,
  is_duplicate boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE scraping_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_listings ENABLE ROW LEVEL SECURITY;

-- Policies for scraping_sessions
CREATE POLICY "Allow public read access" ON scraping_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON scraping_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON scraping_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON scraping_sessions FOR DELETE USING (true);

-- Policies for listings
CREATE POLICY "Allow public read access" ON listings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON listings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON listings FOR DELETE USING (true);

-- Policies for processed_listings
CREATE POLICY "Allow public read access" ON processed_listings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON processed_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON processed_listings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON processed_listings FOR DELETE USING (true);