# CareerShield

AI job radar + reskilling demo for India's IT workforce. React (Vite) frontend
+ a tiny serverless function that proxies Claude API calls so the API key
never reaches the browser.

## Run it locally

```
npm install
npm run dev
```

Opens at http://localhost:5173 — but the AI features (Skill Gap Analyzer,
Mock Interview, Resume Checker) need `api/claude.js` running too, which only
happens on Vercel's dev server:

```
npm install -g vercel
vercel dev
```

## Get an Anthropic API key

1. Go to https://console.anthropic.com
2. Sign up / log in → **API Keys** → **Create Key**
3. Copy it (starts with `sk-ant-...`)

## Deploy for free (Vercel)

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com → **Add New Project** → import that repo.
3. Vercel auto-detects Vite — leave build settings as default.
4. Before deploying, open **Environment Variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from above
5. Click **Deploy**. In ~1 minute you get a live URL like
   `careershield.vercel.app`.

That's it — a real, public website with working AI features.

## Deploy for free (Netlify, alternative)

1. Push to GitHub, then **Add new site → Import an existing project** on
   https://app.netlify.com
2. Build command: `npm run build`, publish directory: `dist`
3. Site settings → Environment variables → add `ANTHROPIC_API_KEY`
4. Netlify Functions need `api/claude.js` moved to `netlify/functions/claude.js`
   and the fetch URL in `src/App.jsx` changed from `/api/claude` to
   `/.netlify/functions/claude` — Vercel is the simpler path if you want to
   avoid this step.

## Custom domain (optional)

In Vercel: **Project → Settings → Domains → Add** — works with a domain
bought from Namecheap, GoDaddy, etc., or a free subdomain Vercel gives you.
