-- Faza captions: poziția și presetul de stil pentru textul scenei.
-- Textul în sine e deja în shots.overlay_text.
ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS caption_position text NOT NULL DEFAULT 'bottom'
    CHECK (caption_position IN ('top', 'center', 'bottom')),
  ADD COLUMN IF NOT EXISTS caption_preset text NOT NULL DEFAULT 'hookBold';
