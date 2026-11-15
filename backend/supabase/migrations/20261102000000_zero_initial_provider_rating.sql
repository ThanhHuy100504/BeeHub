BEGIN;
ALTER TABLE public.provider_profiles ALTER COLUMN rating SET DEFAULT 0;
-- Preserve providers with actual reviews, including unpublished reviews.
UPDATE public.provider_profiles AS p
SET rating = 0
WHERE COALESCE(p.total_reviews, 0) = 0
  AND p.rating IS DISTINCT FROM 0
  AND NOT EXISTS (SELECT 1 FROM public.reviews AS r WHERE r.provider_id = p.id);
COMMIT;
