/*
  # Add Email Domain Validation and Search Activity Logging

  ## Overview
  This migration adds RateGain email validation and comprehensive search activity logging to track user behavior and usage patterns.

  ## 1. Email Domain Validation
    
  ### Email Validation Function
    - Creates a PostgreSQL function to validate email domains
    - Only allows @rategain.com email addresses
    - Can be used in RLS policies and application logic
  
  ## 2. Search Activity Logging
    
  ### Create search_logs table
    - Automatically tracks every search performed
    - Records user, search details, and result counts
    - Provides audit trail for compliance and analytics
    - Links to scraping_sessions for detailed data
  
  ### Key Fields
    - `user_id` - Who performed the search
    - `user_email` - Email of the user (denormalized for reporting)
    - `business_type` - What they searched for
    - `location` - Where they searched
    - `result_count` - How many records were found
    - `was_cached` - Whether results came from cache (no API cost)
    - `search_date` - When the search occurred
  
  ## 3. Statistics Views
    
  ### user_search_stats view
    - Aggregates search activity by user
    - Shows total searches and records extracted
    - Distinguishes between new searches and cached searches
  
  ## 4. Security
    
  ### RLS Policies
    - Users can view their own search logs
    - Admin role can view all logs (future enhancement)
    - All policies enforce authentication
  
  ## 5. Important Notes
    - Email verification is handled by Supabase Auth configuration
    - The validation function can be used for signup restrictions
    - Search logs are immutable (no update/delete policies)
    - Statistics are real-time using database views
*/

-- Create email validation function
CREATE OR REPLACE FUNCTION is_rategain_email(email text)
RETURNS boolean AS $$
BEGIN
  RETURN email ILIKE '%@rategain.com';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create search_logs table for activity tracking
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  user_email text NOT NULL,
  session_id uuid REFERENCES scraping_sessions(id),
  business_type text NOT NULL,
  location text NOT NULL,
  result_count integer DEFAULT 0,
  was_cached boolean DEFAULT false,
  search_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_search_logs_user ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_date ON search_logs(search_date);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_date ON search_logs(user_id, search_date DESC);

-- Enable RLS on search_logs
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Policies for search_logs
CREATE POLICY "Users can view own search logs"
  ON search_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search logs"
  ON search_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_search_stats AS
SELECT 
  user_id,
  user_email,
  COUNT(*) as total_searches,
  COUNT(*) FILTER (WHERE was_cached = false) as new_searches,
  COUNT(*) FILTER (WHERE was_cached = true) as cached_searches,
  SUM(result_count) as total_records_extracted,
  MAX(search_date) as last_search_date,
  MIN(search_date) as first_search_date
FROM search_logs
GROUP BY user_id, user_email;

-- Grant access to the view
GRANT SELECT ON user_search_stats TO authenticated;

-- Create RLS policy for the view
ALTER VIEW user_search_stats SET (security_invoker = on);

-- Add a helper function to log searches (to be called from application)
CREATE OR REPLACE FUNCTION log_search(
  p_user_id uuid,
  p_user_email text,
  p_session_id uuid,
  p_business_type text,
  p_location text,
  p_result_count integer,
  p_was_cached boolean
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO search_logs (
    user_id,
    user_email,
    session_id,
    business_type,
    location,
    result_count,
    was_cached
  ) VALUES (
    p_user_id,
    p_user_email,
    p_session_id,
    p_business_type,
    p_location,
    p_result_count,
    p_was_cached
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;