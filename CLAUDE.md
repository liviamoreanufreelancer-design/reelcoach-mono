# ReelCoach — context de lucru

## Cine și cum

Liv — dezvoltator unic, owner. Lucrează din terminal pe macOS (zsh).
Parteneră non-tehnică — creează concepte, filmează material demonstrativ, scrie
pool-uri de conținut. Lucrează exclusiv prin Studio (web).

**Limba de lucru: română.** Cod și identificatori în engleză, conversația în română.

**Preferințe:**
- Comenzi de terminal concrete, pas cu pas. Nu explicații abstracte.
- `npx tsc --noEmit` confirmat înainte de orice commit.
- Commit la fiecare stare confirmată funcțională, nu la final.
- Patch-uri mici și verificabile. Fără refactorizări necerute.
- Fără dependințe noi fără să întrebi.
- Fără fișiere `.bak` lăsate în urmă.

---

## Produs

Aplicație iOS pentru stiliste (păr, machiaj, unghii, gene, sprâncene) care le
ghidează pas cu pas să filmeze reeluri pentru Instagram/TikTok.

Poziționare: **"apeși, filmezi, gata"** — zero montaj. Nu e CapCut.

"Chef's choice": partenera setează în Studio toate efectele per scenă (filtru,
tranziție, viteză, motion blur). Stilista nu are controale de stil — editează
doar textul.

Export fără audio — stilista adaugă sunet trending nativ în IG/TikTok.

### Ce validează asta

Chestionar (n=5, eșantion mic):
- **4 din 4 postere active: MONTAJUL le ia cel mai mult timp.** Singurul răspuns
  unanim din tot setul.
- 3 din 4 folosesc sunet din IG/TikTok → "export fără audio" e corect.
- Refuzul clientelor de a apărea: "foarte rar" sau deloc. Nu e barieră reală.
- Jumătate filmează cu clienta pe scaun, jumătate între cliente.

Conversație directă cu stiliste: **vor 3-4 reeluri + story-uri dintr-o singură
filmare.** De aici vine modelul de sesiune (mai jos).

---

## Arhitectură

Monorepo: `~/Code/reelcoach-mono` (npm workspaces).

**NICIODATĂ pe Desktop.** iCloud face fișierele "dataless" → build-uri de 16
minute, fișiere fantomă " 2.", bus errors.

- `apps/mobile` — TanStack Start + React 19 + Tailwind 4 + Capacitor iOS
- `apps/studio` — Next.js 15, Vercel, Root Dir `apps/studio`
- `packages/reel-core` — engine framework-agnostic (canvas / video /
  MediaRecorder, **zero React**)

Backend: Supabase `qzbknlkxpteliocwjwvm` (eu-central-1). Migrații până la 010.
Buckets: `previews`, `samples`, `covers`, `examples`.

### Principii (nu le încălca)

1. **Preview = export.** `renderPreviewFrame` din core e singura sursă de adevăr
   pentru preview-ul din Studio ȘI pentru exportul din mobile. Aproximările CSS
   creează drift silențios. Modifici randarea într-un singur loc.
2. **Contracte tipate, nu string-uri.** Tipuri generate Supabase + TS strict.
3. **Separare de straturi:** engine ← date Supabase ← UI React.
4. În Next.js, core e client-only.

### Build mobile (secvență strictă)

```
npm run build:mobile        # NU "npm run build" — ăla e doar web
cd apps/mobile && npx cap sync ios
# Xcode: Cmd+Shift+K, apoi Cmd+R
# Șterge și reinstalează appul pe device (curăță cache-ul IndexedDB)
```

---

## Stare verificată a footage-ului (investigație făcută)

**Clipurile brute supraviețuiesc exportului: DA.**
- IndexedDB (`idb-keyval`), cheia `clip:${scenarioId}:${sceneIdx}`
- Blob real, structured-clone. Nu base64, nu ArrayBuffer.
- Nimic din calea de export nu le șterge.
- `renderReelInBrowser` e funcție pură de `(clips[], options)` → re-rulabilă
  oricând peste aceleași surse.

Singurele ștergeri: `edit.tsx` restart() ("Reia filmările") și `my-reels.tsx`
onDelete ("Șterge reel"). `revokeObjectURL` revocă doar handle-ul, nu Blob-ul.

**Sesiunea supraviețuiește întreruperii: PARȚIAL, în practică DA.**
Clipurile din IDB spun ce e filmat, `selectedIdeaId` e în localStorage, ecranul
sare automat la prima scenă nefilmată. Se pierde doar UI efemer.

Nota veche "C.3 persist footage IndexedDB nefăcut" e **depășită**.

---

## SARCINI IMEDIATE

### 1. `setCaptured` în interiorul `try` (BLOCANT)

`film.tsx` ~218–233. Azi: `saveClip` eșuează → eroarea e logată → `setCaptured`
rulează oricum (e în afara `try`). Stilista vede bifă verde pe o scenă NEsalvată.
Descoperă după 3 ore că îi lipsesc scene.

Se declanșează real când IDB e plin. Nu e caz teoretic.

Fix: scena se marchează filmată doar dacă salvarea a reușit. La eșec, mesaj
vizibil — nu doar `console.error`.

### 2. Confirmare pe "Reia filmările"

`edit.tsx` restart() ~544, buton ~1053. Singura ștergere fără confirmare, chiar
lângă un reel terminat. "Șterge reel" are deja `window.confirm` — aliniază-le.

### 3. Șterge codul mort

- `lib/ffmpeg.ts` — ~360 linii, neimportat. Calea reală e `renderReelInBrowser`.
- `reelcoach:autoGenerate` — scris în `film.tsx` ~268 și `my-reels.tsx` ~59,
  citit niciodată.

Commit separat.

### 4. Măsurători pe device — FĂCUT (01.08.2026, iPhone real)

Instrument: `lib/diag.ts`, `__diag()` din Safari Web Inspector. TEMPORAR —
se șterge cu fișierul + linia `import "@/lib/diag";` din `__root.tsx`.

**Codec: MP4/H.264 nativ. ✅**
`video/mp4; codecs=avc1.42000a,mp4a.40.2`. NU cade pe webm. Exportul nu are
nevoie de transcodare. Profil Baseline (`42`) — cel mai compatibil, cel mai
puțin eficient; de aici bitrate-ul mare.

**Supraviețuire: DA, 19,8 zile. ✅ (era "cel mai important")**
Clipuri filmate 12.07, încă intacte la 01.08, peste zeci de reporniri —
**și cu `persistenta: false`**. WebKit nu le-a evacuat nici neprotejate.

**`navigator.storage.persist()` întoarce `false`** în Capacitor. Confirmă
riscul teoretic, dar datele reale îl infirmă în practică (vezi mai sus).

**`estimate()` MINTE pe iOS. 🔴 Descoperire nouă.**
Raportează `0.2 MB` folosiți când în IndexedDB sunt real `35.87 MB` — de ~180×
sub realitate. **`getStorageEstimate()` e inutilizabil ca indicator de cotă pe
iOS.** Orice avertisment "memoria se umple" construit pe el ar tăcea exact când
e nevoie de el. Dacă vrem vreodată un asemenea avertisment, se calculează prin
însumarea `blob.size`, cum face `__diag`.

**Dimensiuni reale:**
- **1,12 MB/s** (~9 Mbps, cu audio). Clip 4s ≈ 4,4 MB, 5s ≈ 5,6 MB, 6s ≈ 7,2 MB
- Medie 5,12 MB/clip; **sesiune de 8 momente × ~4,5s ≈ 40 MB**
- Cotă raportată 9830 MB → ~240 de sesiuni (indicativ, vezi minciuna de mai sus)
- Un singur MP4 exportat de 30s la 12–30 Mbps ≈ 45–110 MB — **mai mult decât
  toată sesiunea brută.** Confirmă "nu randa eager, nu persista 4 MP4-uri".

**Timpul de randare** nu e în `__diag` — se citește din UI-ul de export
(secundele de sub bara de progres).

**VERDICT: contingența `Directory.Data` NU e necesară.** Dovada empirică bate
valoarea de retur a API-ului. Nu mutăm stratul de stocare.

Singura necunoscută rămasă: evacuarea iOS se declanșează la *presiune de
stocare*, iar testul s-a făcut pe un telefon cu 9,6 GB liberi. **De retestat pe
un telefon aproape plin** — poate aștepta primele stiliste reale.

Opțiune deschisă, nu bug: bitrate-ul din `useRecorder.ts` e nesetat (~9 Mbps,
profil Baseline). Un plafon la 5–6 Mbps ar tăia ~40% din mărime la calitate
practic identică pentru 1080p. Decizie de calitate, neluată.

### 5. Restul listei de lansare — COD FĂCUT, rămâne testul pe device

**Faza 5 text overlay — FĂCUT.** Lanțul complet, verificat verigă cu verigă:
`supabase-client.ts:84` (`text_layers`) → `db-to-template.ts:143` →
`shots.ts:157/161/179/234` (Shot → Omit → ResolvedShot → resolveShot) →
`scenarios.ts:181` (`Scene.textLayers`) → `template-adapter.ts:79` →
`edit.tsx:253-291` → `overlay-renderer.ts:412` (`drawTextLayers`, prioritate
peste caption) → `renderReelInBrowser` prin `overlays`.
Include și editarea in-place a stilistei (`lib/scene-layers.ts` →
`effectiveLayers`, `state.layerTextEdits`). `textLayers` e parte din cheia de
cache a overlay-ului — fără asta, editările ar fi servit cadre vechi.

**`difficulty` — FĂCUT.** `template-adapter.ts:98` = `t.difficulty ?? "easy"`.

**Cover fallback — FĂCUT, altfel decât se plănuise.** NU se urcă nimic în
bucket. `db-to-template.ts:33` importă un asset bundlat (`template-luxury.jpg`)
ca `FALLBACK_COVER`. 404-ul devine imposibil, merge offline, zero dependență de
Supabase. **Decizie confirmată: rămâne bundlat.** Dacă cineva urcă
`covers/_fallback.jpg`, fișierul NU va fi folosit.

**RĂMÂNE: test end-to-end pe device.** Studio text → publish → `cap sync` →
reinstalare app → verifici pe ecranul de filmare și pe reelul exportat că
textele partenerei apar.

---

## VIZIUNEA: modelul de sesiune

Unitatea nu mai e reel-ul, ci **sesiunea**. "O clientă = conținut pentru o
săptămână." Ce cumpără stilistele nu e volum, e liniștea de a nu ajunge luni
fără nimic de postat.

### Traseul stilistei

**0. Înainte de app** — notificare: "Ai balayage la 10:00. 8 momente, primești
3 reeluri." **[NOU]**
Cea mai mare problemă a oricărei aplicații nu e ce face, ci că omul uită s-o
deschidă. Dacă appul știe programul, nu mai depinzi de memoria ei.

**1. Acasă** — o întrebare: ce ai azi pe scaun? Listă scurtă de servicii.
**Două atingeri până la filmare.** Are clienta în față, mâinile pe cale să fie
ocupate. Orice ecran de răsfoit pus aici omoară produsul. **[există, se simplifică]**

**2. Ce urmează** — 15 secunde, înainte de orice efort: **[NOU]**
> Balayage — 8 momente · ~4 minute · Primești: 3 reeluri + 5 story-uri

Motivația vine din raportul efort/rezultat arătat ÎNAINTE. Fără el, la momentul
6 din 8 se întreabă de ce mai face asta.

**3. Filmarea** — răspândită pe 3 ore. **[există complet]**
Se adaugă: contor `4/8` permanent, unele momente sunt **poze** (before, rezultat
final, prim-plan — un frame din video iese neclar), reordonare.
Punctul cel mai fragil din produs. Nu tehnic — uman. Ora 2, obosită, clienta
vorbește. Aici se pierde utilizatoarea, nu la export.

**4. Sfârșitul** — arată **pachetul**, nu un reel. **[NOU]**
Regulă absolută: 5 din 8 capturi → 2 reeluri în loc de 3. **NICIODATĂ ZERO.**
Numărătoarea merge **în sus**, fără numitor:
> Ai 3 reeluri și 4 story-uri. Mai filmează reacția → 5 reeluri.

Nu procent, nu "83%". Un procent îi spune că a eșuat când n-a eșuat.

**5. Pachetul** — cartonașe: 3-4 reeluri + before/after + story-uri, cu text
generat editabil. Nu vede efecte, filtre, timeline. **[NOU]**

**CRITIC: cartonașele arată CADRE-POSTER, nu video randate.**
`captureStream` + `MediaRecorder` randează în TIMP REAL. 4 outputuri = 4x timpul.
Nu poți face stilista să aștepte un minut la finalul programării.
`renderPreviewFrame` costă milisecunde. Randarea completă doar **la export**.
Bonus: nu randezi ce nu se folosește, nu persiști 4 MP4-uri (~45 MB / 30s fiecare).

**6. Export** — share nativ iOS, fără audio. **[există]**

**7. La 7 zile** — o întrebare: cum a mers? Trei butoane. **[NOU, mic]**
Singurul loc unde appul învață ceva ce nu i-a spus partenera.

### Traseul partenerei (Studio)

**Azi:** un template = un reel.
**Nou:** o sesiune = un set de capturi → mai multe rezultate.

**1.** Vede sesiuni (Balayage, Tuns, Extensii), nu template-uri.

**2. Două jumătăți:**
- **Stânga — ce se filmează:** momentele în ordinea reală a serviciului. Pentru
  fiecare: telefon, distanță, mișcare, lumină, durată, imagine-exemplu, plus NOU
  **poză sau filmuleț**. **[în mare parte există]**
- **Dreapta — ce iese:** lista de rezultate, fiecare cu **din ce momente e făcut**.
  **[NOU]**
  > Reel "Transformarea" ← before → aplicare → dezvăluire

Asta e **singura piesă cu adevărat nouă în model**. Un moment intră în mai multe
rezultate; un rezultat cere mai multe momente. Relație many-to-many.
Regula "niciodată zero" rezultă automat din legături — nu se programează separat.

**3. Verifică pe footage.** Vede toate cele 4 rezultate deodată. Aici prinde
problema pe care n-o prinde nimeni altcineva: **seamănă prea mult între ele?**
Riscul real al modelului nu e tehnic — e ca stilista să posteze de 4 ori aceeași
clientă și audiența să se plictisească. Decizie de gust, e a ei.

**4. Ciornă și publicare.** **[există, testat]**

**5. Variante de text:** AI scrie, **ea aprobă sau taie**. **[NOU]**
Scrie conceptul + 3 exemple bune, restul se generează. Trece de la autor la
aprobator. Judecata rămâne la ea, transcrierea dispare.

---

## CUM ÎNVAȚĂ STILISTA SĂ FILMEZE

Trei momente distincte, fiecare cu altă capacitate de atenție:
- **Înainte de scenă (3s)** — poate citi. Aici pui toată greutatea.
- **În timpul filmării (0s)** — nu poate citi nimic. Se uită la clientă.
- **După (2s)** — vede ce a ieșit, decide dacă reface.

În ordinea raportului valoare/efort:

1. **Imaginea-exemplu MARE, pe tot ecranul, înainte de filmare.** Imaginea există
   deja — doar e prea discretă și vine prea târziu. Nu mai interpretează o
   descriere, potrivește ce vede cu ce are în față.
2. **Aceeași imagine ca fantomă peste preview-ul camerei.** Mișcă telefonul până
   se suprapun. Rezolvă "unde pun telefonul" mai direct decât orice diagramă.
3. **O singură propoziție, nu o listă.** Lista `howShoot` e deja ascunsă —
   instinctul a fost corect. Lipsește propoziția care o înlocuiește.
4. **Verbul înainte de substantiv.** "Apropie-te de folii" > "Prim-plan folii,
   distanță mică". Prima e acțiune, a doua cere traducere.
5. **Onboarding o singură dată**, trei ecrane, la primul reel.

Studio: partenera scrie **o propoziție de acțiune** per scenă. Variabilele rămân
(ele definesc filmarea); propoziția e traducerea pentru om.

---

## ECONOMIA MUNCII PARTENEREI (important)

Riscul de persoană-cheie e real: dacă partenera se îmbolnăvește, produsul
îngheață (nu moare — conținutul e scris și e în bază de date). Fiecare element
care cere atenția ei **per scenă** e o frână pe scalare.

### Testarea efectelor se face pe STOCK, nu pe footage propriu

Când setează efectele, ea nu evaluează conținutul — evaluează dacă tranziția e
prea rapidă, filtrul prea saturat, viteza bună. Pentru asta nu contează ce e în
cadru, contează durata și mișcarea.

**10-15 clipuri stock neutre**, alese după TIPUL DE MIȘCARE, nu după subiect:
static prim-plan, static plan mediu, apropiere lentă, pan orizontal, mișcare
rapidă, mâini care lucrează.

Un clip static face orice tranziție să pară curată. Unul cu mișcare rapidă scoate
problemele la iveală. **2-3 clipuri comutabile dintr-un buton** — vede aceeași
combinație pe cadru calm și pe cadru cu mișcare în două secunde.

Nu-ți trebuie stock frumos. Îți trebuie stock **reprezentativ** — inclusiv
mișcare imperfectă, ca decalajul față de realitatea din salon să fie mic.

Efectele se aplică identic (același cod de randare), deci nu aproximezi nimic.
Aceeași disciplină ca "preview = export", cu alt input.

Verificare o singură dată: aprobă câteva combinații pe stock, apoi le vede pe
footage real de salon. O oră, o dată — nu la fiecare concept.

**Bucket-ul `previews` (38 preview-uri per efect) NU e modelul.** Ăla era
combinatoric imposibil (N×M×K fișiere). Stock ca material de INTRARE peste care
se aplică efectele reale = ~15 clipuri.

### Imaginile-exemplu: bibliotecă refolosibilă, nu una per scenă

Cele mai multe scene NU sunt unice. "Prim-plan mâini, telefon vertical, 30 cm"
arată la fel la balayage, manichiură, gene. **Nu o imagine per scenă — o imagine
per TIP DE CADRU**, refolosită de zeci de ori. ~20-30 acoperă tot, în toate
verticalele.

Trei opțiuni în Studio, în ordinea efortului:
1. **Alege din bibliotecă** — zero muncă, majoritatea cazurilor
2. **Cadru din footage propriu** — doar când scena e specifică
3. **Lasă gol** — scena funcționează (text, variabile, durată). Imaginea e plus,
   nu cerință.

Opțiunea 3 e esențială: dacă imaginea devine obligatorie, verticala #6 e blocată
până găsește ea timp. Costul trebuie să fie FIX, nu proporțional cu scenele.

### Biblioteca de demonstrații video (aprobat, de filmat)

~20-30 demonstrații universale: **cum stă telefonul și de unde vine lumina**
pentru un tip de cadru. Subiectul din fața camerei e irelevant.

Criteriu de împărțire: dacă două scene din verticale diferite s-ar filma identic,
sunt aceeași demonstrație. Dacă faci demonstrații per verticală, ajungi la sute
și ai reconstruit problema pe care o eviți.

**Perspectiva contează mai mult decât conținutul:** filmate din SPATELE stilistei
— se vede ea, telefonul, poziția, de unde bate lumina. Nu din perspectiva
telefonului (aia arată rezultatul, nu setup-ul, și exact setup-ul nu poate deduce
singură).

**Lumina se tratează separat.** 5-6 situații (fereastră laterală, fereastră în
față, doar tavan, ring light). Poziția telefonului se poate arăta și dintr-o
imagine fixă; lumina nu — diferența se vede doar comparativ, în mișcare. Lumina
proastă strică footage-ul iremediabil; un unghi imperfect încă dă ceva utilizabil.

**Filmați 3-4 întâi, testați cu o stilistă, apoi restul.** Dacă perspectiva sau
lungimea nu e potrivită, afli după 4, nu după 25.

### Continuitate — de făcut ACUM, nu se recuperează retroactiv

**Când partenera respinge ceva, scrie DE CE.** O linie: "prea lung", "sună a
reclamă", "nu se potrivește la unghii".

Cel mai important element din tot Studio pe termen lung. Cunoașterea tacită iese
din capul ei și intră în sistem, o propoziție pe rând. Peste un an: câteva sute
de decizii explicate = manual pentru un înlocuitor + materie primă pentru orice
automatizare.

Costă secunde. Nefăcut azi, e pierdut definitiv.

Alte măsuri (fără cod):
- Document "cum gândesc" scris de ea (o după-amiază, cel mai bun raport
  valoare/timp)
- Stoc tampon 6-8 săptămâni în avans → o boală devine pauză, nu criză
- A doua persoană part-time pe o verticală → testează cât costă expertiza a doua

---

## DECIZII ÎNCHISE (nu le redeschide fără discuție)

- **NU tăia audio de pe clipurile brute** (`audio: true`), deși reel-ul e mut.
  ASMR performează bine în beauty (foarfeca, pila, apa). Arunci audio la captură
  → foreclozi un tip întreg de conținut, retroactiv nerecuperabil.
- **NU randa eager.** Cadre-poster în pachet, randare completă doar la export.
- **NU construi "Capture Engine" / "recipes" / scene compoziționale cross-verticală.**
  Explorat și respins: datele spun că durerea e MONTAJUL, nu ideația. Sistemele
  compoziționale au cold-start prost (prima bucată nu dă nimic utilizabil) și cer
  MAI MULTĂ muncă de expert, nu mai puțină — adică adâncesc exact dependența de
  parteneră. Se reia după primele stiliste reale, cu date de comportament.
- **NU real-time camera coaching** (detectare lumină/încadrare în timp real).
  Nu e feature, e rescriere spre nativ — WKWebView nu suportă analiză CV la
  framerate utilizabil. Există deja ca produs separat (FrameCoach, ShotCoach),
  deci e greu destul cât să susțină o companie întreagă.
- **NU sistem de diagrame** pentru instrucțiuni de filmare. Problema nu e
  confirmată, e cel mai scump mod de a o rezolva, și creează obligație de conținut
  permanentă pe parteneră. Alternativa aprobată: demonstrații video refolosibile.
- **NU programare/publicare automată pe social media, deocamdată.** Blocaj de
  platformă: API-ul publică fișierul ca atare — **nu poate adăuga sunet trending**.
  Ori programezi și pierzi sunetul, ori păstrezi sunetul și postezi manual. Audio-ul
  trending influențează distribuția pe Reels. Necesită și cont Business/Creator +
  OAuth + tokenuri + cozi = infrastructură disproporționată.
  **Alternativa (80% din valoare, 5% din cost):** plan de postare cu memento —
  "Transformarea → marți, Procesul → joi", notificarea deschide appul la exportul
  respectiv, ea apasă share și adaugă sunetul. Zero API.
  Dacă vreodată se automatizează: story-urile primele (nu depind de audio trending).
- **Chef's choice rămâne.** Stilista nu primește controale de stil.
- **Export fără audio rămâne.**
- **Cover fallback bundlat, NU în bucket.** `db-to-template.ts` importă un asset
  local. Nu "repara" 404-ul vechi urcând `covers/_fallback.jpg` — n-ar fi folosit,
  și ai reintroduce o dependență de rețea unde nu mai e nevoie de una.
- **NU muta clipurile pe `Directory.Data`.** Măsurat pe device (§4): supraviețuiesc
  19,8 zile cu `persist()` fals. Contingența rămâne scrisă, dar nu se execută fără
  o dovadă nouă (ex. eșec pe telefon aproape plin).
- **Rule-based, nu AI, pentru structura outputurilor.** Slot-matching: fiecare
  output cere un set de sloturi; dat fiind ce s-a capturat, ce outputuri au toate
  sloturile pline.
- **Nu automatiza ce n-a fost făcut manual întâi.** Înainte de engine multi-output,
  partenera produce manual 4 outputuri distincte dintr-o sesiune reală.
- **Uman la poarta finală de publicare**, cel puțin primul an.

---

## PENTRU LANSARE — unde pui efortul vizual

Momentul "wow" nu e ecranul de filmare. E cel în care stilista termină și **vede
reelul gata, fără să fi montat nimic**. Nicio ilustrație nu compensează un drum
presărat cu erori.

În ordine:
1. **Nimic nu se rupe.** Un 404, o bifă falsă, o selecție pierdută — fiecare
   distruge mai multă credibilitate decât adaugă orice element vizual.
2. **Fluența, nu frumusețea.** Un app rapid pare profesionist cu grafică simplă.
   Un app frumos care ezită două secunde pare neterminat.
3. **Un singur reel exemplu foarte bun**, filmat cu o clientă reală, montat de app.
   Cel mai mare câștig per oră din toată lista.

Grija estetică se pune pe **ecranul de start** ("8 momente → 3 reeluri") și pe
**ecranul de pachet** — ambele noi, ambele spun povestea produsului dintr-o
privire. Nu adăuga elemente vizuale care cer conținut recurent.

---

## Riscuri cunoscute

- **Fără gestionare de cotă/eviction.** `navigator.storage.persist()` e
  best-effort; iOS WKWebView nu garantează nimic. Dacă appul nu e pe Home Screen,
  datele pot fi evacuate — exact scenariul "revine după 40 de minute", repetat.
- **Bitrate de înregistrare nesetat** (`useRecorder.ts`) — n-ai control pe mărime.
- **Randare în timp real** — multiplicare liniară cu numărul de outputuri.
- **Footage 4K în Studio sufocă randarea. 🔴 Măsurat.** Sursele partenerei la
  2160×3840 / 2160×4096 au dus randarea la **9 fps efectiv din 24** — 37% din
  viteza necesară. Randarea fiind în timp real, cadrele pierdute NU se recuperează:
  rezultatul e sacadat, iar la margini apare negru. Cu surse 1080p, aceeași
  scenă merge curat. Reel-ul final e 1080×1920, deci cei 4K se aruncă integral,
  dar costă de 4× munca per cadru.
  **Partenera trebuie să încarce 1080p** (telefon: Settings → Camera → Record
  Video → 1080p). Scade și timpul de upload, și spațiul din bucket.
  `renderReelInBrowser` loghează la final `[render] N cadre in Xs = Y fps efectiv`
  — dacă Y e mult sub țintă, întâi verifică rezoluția surselor.
- **Repetitivitate percepută:** 4 postări cu aceeași clientă într-o săptămână.
  Contează cât de DISTINCTE sunt, nu câte. Problemă de design de conținut
  (parteneră), nu de cod.

---

## Ce NU face fără să întrebi

- Refactorizări necerute
- Dependințe noi
- Modificări în `packages/reel-core` fără să verifici impactul pe ambele apps
- Migrații Supabase fără discuție (ultima e 011)
- Commit fără `npx tsc --noEmit` curat

### CAPCANĂ: coloane noi în `shots` se pierd la publicare

RPC-ul `publish_draft_changes` (sistemul de ciornă) **listează explicit fiecare
coloană** din `shots` când copiază ciorna peste template-ul publicat.

**Orice migrație care adaugă o coloană în `shots` trebuie să actualizeze și
funcția asta.** Altfel coloana nouă se pierde tăcut la fiecare „Publică
modificările" — fără eroare, fără semnal, doar date care dispar.

S-a întâmplat deja: migrația 010 a adăugat `text_layers`, RPC-ul n-a fost
actualizat, iar tot textul multi-strat al partenerei era șters la publicare.
Codul era corect cap-coadă; publicarea distrugea datele înainte să ajungă pe
telefon. Reparat de migrația 011.

Simptomul e înșelător: pare că funcția din mobile „nu merge", când de fapt
datele n-au ajuns niciodată acolo. Dacă ceva setat în Studio nu apare pe
device, verifică întâi lista de coloane din `publish_draft_changes`.
