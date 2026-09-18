-- Every goal read filters by owner AND excludes deleted rows
-- (`user_id = auth.uid() AND status <> 'deleted'`). The existing single-column
-- goals_user_idx cannot serve the status predicate, so add the composite index
-- and drop the now-redundant prefix index (the composite covers user_id alone).
CREATE INDEX IF NOT EXISTS goals_user_status_idx ON public.goals (user_id, status);
DROP INDEX IF EXISTS public.goals_user_idx;