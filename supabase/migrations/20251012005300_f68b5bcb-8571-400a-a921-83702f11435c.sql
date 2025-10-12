-- Fix PUBLIC_DATA_EXPOSURE: Update RLS policies to require authentication for all 7 tables

-- 1. creators table
DROP POLICY IF EXISTS "creators_read" ON public.creators;
CREATE POLICY "creators_read" ON public.creators
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- 2. creator_daily_stats table
DROP POLICY IF EXISTS "daily_stats_read" ON public.creator_daily_stats;
CREATE POLICY "daily_stats_read" ON public.creator_daily_stats
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- 3. creator_interactions table
DROP POLICY IF EXISTS "interactions_read" ON public.creator_interactions;
CREATE POLICY "interactions_read" ON public.creator_interactions
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- 4. creator_metrics table
DROP POLICY IF EXISTS "metrics_read" ON public.creator_metrics;
CREATE POLICY "metrics_read" ON public.creator_metrics
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- 5. creator_recommendations table
DROP POLICY IF EXISTS "recommendations_read" ON public.creator_recommendations;
CREATE POLICY "recommendations_read" ON public.creator_recommendations
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- 6. managers table
DROP POLICY IF EXISTS "managers_read" ON public.managers;
CREATE POLICY "managers_read" ON public.managers
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- 7. uploaded_reports table
DROP POLICY IF EXISTS "reports_read" ON public.uploaded_reports;
CREATE POLICY "reports_read" ON public.uploaded_reports
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);