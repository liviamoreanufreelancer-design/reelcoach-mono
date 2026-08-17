-- ════════════════════════════════════════════════════════════════════
--  021 — Catalogul de tipuri de cadru
-- ════════════════════════════════════════════════════════════════════
--
--  PROBLEMA CARE-L FORTEAZA SA EXISTE (bug real, nu preferinta)
--
--  Cadrele variantelor primeau chei generate dupa pozitia lor IN VARIANTA:
--  primul cadru = `cadru-1`, al doilea = `cadru-2`. Deci:
--
--    Transformarea: cadru-1 = before,    cadru-2 = aplicare
--    Procesul:      cadru-1 = aplicare,  cadru-2 = detaliu
--
--  Importate in acelasi sablon, derivarea le uneste dupa cheie — si `cadru-1`
--  devine acelasi moment in ambele. Stilista filmeaza un singur lucru, iar a
--  doua varianta randeaza before acolo unde voia aplicare. Fara eroare, fara
--  avertisment. Cheile trebuie sa insemne ceva GLOBAL; nu se pot genera local.
--
--  DE CE INSTRUCTIUNILE STAU AICI, NU PE CADRU
--
--  Stilista filmeaza "before"-ul O SINGURA DATA, indiferent cate variante il
--  cer. Ce se filmeaza o data, se descrie o data. Scrise pe cadru, ar fi fost
--  duplicate in fiecare varianta (butonul "Duplica" le-ar fi copiat), iar la
--  import doua variante ar fi adus doua seturi diferite pentru acelasi moment
--  — si ar fi castigat unul arbitrar.
--
--  Costul devine FIX: ~22 de tipuri acopera cele 23 de servicii de la lansare,
--  fiindca `before`, `dezvaluire`, `reactia` si `detaliu` apar in toate
--  familiile. Fara catalog, costul ar fi crescut cu fiecare varianta.
--
--  SEED-UL DE MAI JOS E O CIORNA, NU O PRESCRIPTIE. Tipurile si ordinea vin
--  din structura serviciilor; textele de filmare sunt goale intentionat —
--  alea sunt expertiza partenerei, nu a mea. Catalogul porneste plin de
--  STRUCTURA si gol de CONTINUT, ca ea sa corecteze, nu sa scrie de la zero.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shot_types (
  -- Slug stabil. E cheia care leaga cadrul din varianta de momentul filmat,
  -- deci NU se schimba dupa creare (numele afisat, da).
  id           text PRIMARY KEY,
  name         text NOT NULL,
  /** Familia de servicii unde apare de obicei. Informativ, pentru grupare. */
  family       text,

  -- Ce vede si ce face stilista. Propozitia de actiune e cea mai importanta:
  -- "Apropie-te de folii" bate "Prim-plan folii, distanta mica", fiindca prima
  -- e o actiune si a doua cere traducere.
  hook         text,
  instructions text[] NOT NULL DEFAULT '{}',

  -- Variabilele de filmare (aceleasi ca pe `shots`, migratia 008).
  phone_hold     text,   -- hand | tripod
  shot_distance  text,   -- palm | arm | step | two_steps
  phone_movement text,   -- fixed | follow | pan | zoom
  light_sources  jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Filmare, poza, sau amandoua. Proprietate a TIPULUI: un before se
  -- captureaza la fel indiferent ce varianta il cere.
  capture_kind text NOT NULL DEFAULT 'video',
  /** Imaginea-exemplu, refolosita peste tot unde apare tipul. */
  example_image_url text,

  -- Ordinea fireasca in serviciu. Stilista filmeaza in ordinea asta, nu in
  -- ordinea vreunei variante — de asta ordinea apartine tipului.
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shot_types_order_idx ON shot_types (sort_order);

COMMENT ON TABLE shot_types IS
  'Tipurile de cadru. Instructiunile se scriu o data aici si se importa in sabloane.';
COMMENT ON COLUMN shot_types.id IS
  'Slug stabil — cheia care leaga cadrul variantei de momentul filmat. Nu se schimba.';

ALTER TABLE shot_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shot_types_read ON shot_types;
CREATE POLICY shot_types_read ON shot_types FOR SELECT USING (true);

DROP POLICY IF EXISTS shot_types_write ON shot_types;
CREATE POLICY shot_types_write ON shot_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── Ciorna de pornire: structura, fara continut ─────────────────────
INSERT INTO shot_types (id, name, family, capture_kind, sort_order) VALUES
  ('before',            'Before',                     'comun',    'both',  10),
  ('consultatie',       'Consultația',                'comun',    'video', 20),
  ('pregatire',         'Pregătirea',                 'comun',    'video', 30),
  ('mixare-culoare',    'Mixarea culorii',            'culoare',  'video', 40),
  ('aplicare',          'Aplicarea',                  'culoare',  'video', 50),
  ('aplicare-prim-plan','Aplicarea, prim-plan',       'culoare',  'video', 55),
  ('folii',             'Foliile',                    'culoare',  'video', 60),
  ('procesare',         'Procesarea',                 'culoare',  'video', 70),
  ('spalare',           'Spălarea',                   'culoare',  'video', 80),
  ('taiere',            'Tăierea',                    'tuns',     'video', 45),
  ('taiere-prim-plan',  'Tăierea, prim-plan',         'tuns',     'video', 47),
  ('uscare',            'Uscarea / brushing',         'comun',    'video', 90),
  ('styling',           'Stylingul',                  'tuns',     'video', 95),
  ('ondulare',          'Ondularea',                  'tuns',     'video', 97),
  ('baza-machiaj',      'Baza de machiaj',            'makeup',   'video', 50),
  ('ochi',              'Ochii',                      'makeup',   'video', 60),
  ('gene-sprancene',    'Genele și sprâncenele',      'makeup',   'video', 65),
  ('buze',              'Buzele',                     'makeup',   'video', 70),
  ('detaliu',           'Detaliul',                   'comun',    'both',  100),
  ('miscare-par',       'Mișcarea părului',           'comun',    'video', 105),
  ('dezvaluire',        'Dezvăluirea',                'comun',    'video', 110),
  ('reactia',           'Reacția clientei',           'comun',    'video', 115),
  ('after',             'After',                      'comun',    'both',  120)
ON CONFLICT (id) DO NOTHING;
