-- ============================================================================
-- Migration: Add playback_speed and motion_blur to shots
-- ============================================================================
-- Adds two new fields:
--   - playback_speed: 1.0 default (normal), 0.5 for slow motion, 2.0 for fast
--   - motion_blur: false default; when true, scene-wide motion blur filter
-- ============================================================================

ALTER TABLE public.shots
  ADD COLUMN IF NOT EXISTS playback_speed NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS motion_blur BOOLEAN NOT NULL DEFAULT FALSE;

-- Constrain playback_speed to a reasonable range so we don't get nonsense.
ALTER TABLE public.shots
  DROP CONSTRAINT IF EXISTS shots_playback_speed_range;
ALTER TABLE public.shots
  ADD CONSTRAINT shots_playback_speed_range
  CHECK (playback_speed >= 0.25 AND playback_speed <= 4.0);

-- Verify after running:
--   SELECT id, playback_speed, motion_blur FROM shots LIMIT 5;
