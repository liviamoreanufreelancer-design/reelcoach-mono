-- ════════════════════════════════════════════════════════════════════
--  019 — Biblioteca de materiale: filmarile se urca o data
-- ════════════════════════════════════════════════════════════════════
--
--  Pana acum fiecare urcare era de unica folosinta: mergea in `samples` la o
--  cale legata de momentul sau cadrul pentru care fusese urcata, si nu mai
--  putea fi gasita de nicaieri. Aceeasi "miscare de par" folosita in zece
--  variante insemna zece urcari si zece fisiere identice in bucket.
--
--  Cu modelul de variante (10 abordari peste acelasi material), asta devine
--  costul dominant al muncii partenerei — exact genul de cost care creste cu
--  numarul de lucruri, pe care CLAUDE.md il numeste frana pe scalare.
--
--  REZOLUTIA SE MASOARA LA URCARE, nu se descopera la randare.
--
--  Sursele 4K au dus randarea la 9fps din 24 (masurat, vara asta). Reel-ul
--  final e 1080x1920, deci pixelii in plus se arunca dupa ce ai platit pentru
--  ei. Pana acum asta se descoperea abia cand randarea iesea sacadata, adica
--  dupa ce materialul fusese deja folosit in mai multe variante.
--
--  Latimea si inaltimea se citesc in browser inainte de urcare si se salveaza
--  aici. Biblioteca poate atunci sa arate semnalul la momentul potrivit — cand
--  fisierul intra, nu cand strica ceva.
--
--  Fisierele stau tot in bucketul `samples`, sub prefixul `library/`. Nu cerem
--  un bucket nou: ar fi insemnat un pas manual in Supabase inainte ca ceva sa
--  functioneze.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS media_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Numele dat de partenera. Implicit numele fisierului, editabil: "IMG_4821"
  -- nu se poate cauta, "miscare par, plan mediu" da.
  name         text NOT NULL,
  kind         text NOT NULL DEFAULT 'video',      -- video | image
  url          text NOT NULL,
  -- Calea in bucket, ca stergerea sa poata sterge si fisierul, nu doar randul.
  storage_path text NOT NULL,

  -- Masurate in browser inainte de urcare (vezi comentariul de sus).
  width        int,
  height       int,
  duration_sec real,
  size_bytes   bigint,

  -- Cuvinte de cautare, libere: "par", "maini", "prim-plan", "miscare rapida".
  -- Text liber si nu o taxonomie fixa, din acelasi motiv ca `reel_type`:
  -- vocabularul inca se descopera.
  tags         text[] NOT NULL DEFAULT '{}',

  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_recent_idx ON media_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_tags_idx   ON media_assets USING gin (tags);

COMMENT ON TABLE media_assets IS
  'Filmarile si imaginile partenerei, urcate o data si refolosite oriunde.';
COMMENT ON COLUMN media_assets.width IS
  'Masurata la urcare. Peste 1080 latime = randare mai lenta fara castig: reel-ul final e 1080x1920.';

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_assets_all ON media_assets;
CREATE POLICY media_assets_all ON media_assets
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
