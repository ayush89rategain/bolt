/*
  # Add Authentication and Search Cache System

  ## Overview
  This migration adds user authentication and a search cache system to optimize API usage and prevent duplicate searches.

  ## 1. Schema Changes
    
  ### Update scraping_sessions
    - Add `user_id` column to track which user initiated each search
    - Add `search_query` column for normalized search string
    
  ### Update listings table
    - Add additional fields from Google Maps API:
      - `reviews` (integer) - number of reviews
      - `type` (text) - business type/category
      - `latitude` (numeric) - location coordinates
      - `longitude` (numeric) - location coordinates
      - `opening_hours` (jsonb) - business hours
      - `price_level` (text) - price range indicator
      - `thumbnail` (text) - business image URL
      - `place_id` (text) - Google Place ID
  
  ### Create search_cache table
    - Stores normalized search queries with results
    - Prevents duplicate API calls within cache period (7 days)
    - Links to the session with cached results
    - Tracks which user made the search
  
  ## 2. Security Updates
    
  ### RLS Policies
    - Update policies to use authentication
    - Users can only see their own searches by default
    - Admins can see all searches (future enhancement)
  
  ## 3. Important Notes
    - Search queries are normalized (lowercase, trimmed) for cache matching
    - Cache expires after 7 days to ensure data freshness
    - Users must be authenticated to perform searches
*/

-- Add user_id and search_query to scraping_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE scraping_sessions ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scraping_sessions' AND column_name = 'search_query'
  ) THEN
    ALTER TABLE scraping_sessions ADD COLUMN search_query text;
  END IF;
END $$;

-- Add additional fields to listings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'reviews'
  ) THEN
    ALTER TABLE listings ADD COLUMN reviews integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'type'
  ) THEN
    ALTER TABLE listings ADD COLUMN type text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE listings ADD COLUMN latitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE listings ADD COLUMN longitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'opening_hours'
  ) THEN
    ALTER TABLE listings ADD COLUMN opening_hours jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'price_level'
  ) THEN
    ALTER TABLE listings ADD COLUMN price_level text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'thumbnail'
  ) THEN
    ALTER TABLE listings ADD COLUMN thumbnail text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'place_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN place_id text;
  END IF;
END $$;

-- Create search_cache table
CREATE TABLE IF NOT EXISTS search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  search_query text NOT NULL,
  business_type text NOT NULL,
  location text NOT NULL,
  session_id uuid REFERENCES scraping_sessions(id) ON DELETE CASCADE,
  result_count integer DEFAULT 0,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Create index on search_query for faster lookups
CREATE INDEX IF NOT EXISTS idx_search_cache_query ON search_cache(search_query);
CREATE INDEX IF NOT EXISTS idx_search_cache_user ON search_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires ON search_cache(expires_at);

-- Enable RLS on search_cache
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Drop old public access policies
DROP POLICY IF EXISTS "Allow public read access" ON scraping_sessions;
DROP POLICY IF EXISTS "Allow public insert access" ON scraping_sessions;
DROP POLICY IF EXISTS "Allow public update access" ON scraping_sessions;
DROP POLICY IF EXISTS "Allow public delete access" ON scraping_sessions;

DROP POLICY IF EXISTS "Allow public read access" ON listings;
DROP POLICY IF EXISTS "Allow public insert access" ON listings;
DROP POLICY IF EXISTS "Allow public update access" ON listings;
DROP POLICY IF EXISTS "Allow public delete access" ON listings;

DROP POLICY IF EXISTS "Allow public read access" ON processed_listings;
DROP POLICY IF EXISTS "Allow public insert access" ON processed_listings;
DROP POLICY IF EXISTS "Allow public update access" ON processed_listings;
DROP POLICY IF EXISTS "Allow public delete access" ON processed_listings;

-- Create new authenticated policies for scraping_sessions
CREATE POLICY "Users can view own sessions"
  ON scraping_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON scraping_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON scraping_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON scraping_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create authenticated policies for listings
CREATE POLICY "Users can view listings from own sessions"
  ON listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert listings to own sessions"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update listings from own sessions"
  ON listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete listings from own sessions"
  ON listings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

-- Create authenticated policies for processed_listings
CREATE POLICY "Users can view processed listings from own sessions"
  ON processed_listings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = processed_listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert processed listings to own sessions"
  ON processed_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = processed_listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update processed listings from own sessions"
  ON processed_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = processed_listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = processed_listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete processed listings from own sessions"
  ON processed_listings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scraping_sessions
      WHERE scraping_sessions.id = processed_listings.session_id
      AND scraping_sessions.user_id = auth.uid()
    )
  );

-- Create policies for search_cache
CREATE POLICY "Users can view own search cache"
  ON search_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own search cache"
  ON search_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search cache"
  ON search_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search cache"
  ON search_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);