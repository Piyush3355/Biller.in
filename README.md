# Biller

Invoice management app built with Next.js 14, Supabase, Tailwind CSS, and shadcn/ui.

## Local development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

App runs on [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local` and add:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RESEND_API_KEY=
```

## Supabase setup

- Run SQL migrations from `supabase/migrations`.
- Create a public Storage bucket named `logos` for business logo uploads.

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the repo in [Vercel](https://vercel.com/new).
3. In **Project Settings > Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RESEND_API_KEY`
4. Deploy.

For CLI deployment:

```bash
npx vercel
npx vercel --prod
```
