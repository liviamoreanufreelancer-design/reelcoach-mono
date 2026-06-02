# ReelCoach Studio

Admin webapp for ReelCoach — template editor for the mobile app.

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- Supabase (Postgres + Auth + Storage)
- Deployed on Vercel

## Local setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`** at the project root with these values (get them from the Supabase dashboard → Settings → API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://qzbknlkxpteliocwjwvm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   ```

3. **Run dev server:**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000.

## First-time setup

After deploying or running locally for the first time:

1. Open the app, click "Cont nou? Înregistrează-te".
2. Sign up with `livia.moreanu.freelancer@gmail.com`.
3. Sign up with `ourlivesaswriters@gmail.com`.
4. In Supabase Dashboard → SQL Editor, promote yourself to admin:
   ```sql
   UPDATE profiles SET role='admin' WHERE email='livia.moreanu.freelancer@gmail.com';
   ```
5. Done. Editor stays default.

## Deploy to Vercel

1. Push to GitHub.
2. Go to Vercel → Add New → Project → Import `reelcoach-studio` repo.
3. In Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click Deploy.

The deployed URL will be something like `https://reelcoach-studio.vercel.app`.

## What's in this scaffold (Week 1)

- Auth: email + password sign-up and sign-in via Supabase
- Middleware: redirects unauth users to /login, auth users away from /login
- Dashboard: lists all templates (drafts + published) from Supabase
- Layout: header with email + role + logout
- Champagne palette matching the mobile app

## What's NOT in this scaffold yet

- Template editor (Week 2)
- Scene editor with effect/transition/filter pickers (Week 2)
- File upload to Supabase Storage (Week 2)
- Publish workflow (Week 3)
- Mobile app sync (Week 3)
