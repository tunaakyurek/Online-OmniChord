# Online‑OmniChord — Free Hosting Plan (Cloudflare Pages / Netlify / Vercel) + Local Run Commands

This plan assumes your current project is a **static site** (no framework build step): `index.html`, `songs.html`, `globals.css`, plus `assets/`, `data/`, `src/` (ES modules).

If you only have a GitHub repo, remote iPad users can’t “test” unless you **deploy** it (GitHub Pages *can* do this), but you asked to publish on **Cloudflare Pages / Netlify / Vercel** instead — all three offer free tiers with free HTTPS and a shareable URL.

---

## 1) Recommended repo layout for effortless deployment everywhere

You *can* deploy from repo root, but the cleanest cross‑platform setup is to put **everything that must be served** into a single folder (conventionally `public/`).  
This avoids accidental deployment of docs/zip/scripts and makes every platform config identical.

### 1.1 Create a `public/` directory and move only served files into it

Move these (served by the browser) into `public/`:

- `index.html`
- `songs.html`
- `globals.css`
- `assets/`
- `data/`
- `src/`
- `omnichord.png` (or keep only in `assets/` and update references)

Keep these in repo root (not served):
- `README.md`
- `scripts/` (if they are dev utilities)
- `tools/`
- `*.md` planning docs
- zips, screenshots, etc.

### Checkpoint A
After moving, you should have:
```
public/
  index.html
  songs.html
  globals.css
  assets/
  data/
  src/
README.md
scripts/
tools/
```

---

## 2) Make paths “hosting‑safe”

Your HTML already uses relative paths (good). After moving to `public/`, verify these are still relative (no leading `/`):

In `public/index.html`:
- `./globals.css`
- `./songs.html`
- `assets/omnichord.png` (or `./assets/omnichord.png`)
- `./src/app.js`

In JS:
- `./data/overlayMap.om108.json`
- `./data/songs.json`

### Checkpoint B
Open `public/index.html` and search for **`src="/`** or **`href="/`** (leading slash). There should be none for your own assets.

---

## 3) Local development — one command

### Option 1 (no installs, just Node)
From repo root:

```bash
npx --yes http-server public -p 8080 -c-1
```

Then open:
- `http://127.0.0.1:8080/`
- `http://127.0.0.1:8080/songs.html`

Why `-c-1`? Disables caching so overlay JSON edits show immediately.

### Option 2 (Python only, no Node)
From repo root:

```bash
python -m http.server 8080 --directory public
```

> Use **Option 1** if possible; it tends to be smoother for rapid frontend iteration on Windows.

### Checkpoint C
- Page loads
- “Enable Audio” works
- Overlay fetches JSON successfully (no 404 in DevTools console)

---

## 4) Local WebKit testing — recommended workflow on Windows

### 4.1 Run the server (Terminal A)
```bash
npx --yes http-server public -p 8080 -c-1
```

### 4.2 Run Playwright WebKit (Terminal B)
One‑time:
```bash
npx --yes playwright@latest install webkit
```

Then:
```bash
npx --yes playwright@latest open --browser=webkit http://127.0.0.1:8080/
```

Or for codegen:
```bash
npx --yes playwright@latest codegen --browser=webkit http://127.0.0.1:8080/
```

### Checkpoint D
In WebKit window:
- Hold chord (pointer 1)
- Strum (pointer 2) should not cancel chord
- Knobs drag updates values

---

## 5) “Single command” local dev + WebKit smoke test (optional but convenient)

If you want **one command** to:
1) start the server, and
2) run a Playwright test suite automatically,

add a `package.json` in repo root.

### 5.1 Create `package.json` (recommended)
```json
{
  "name": "online-omnichord",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "http-server public -p 8080 -c-1",
    "test:webkit": "playwright test",
    "dev:test": "concurrently -k -n server,test "npm run dev" "wait-on http://127.0.0.1:8080 && npm run test:webkit""
  },
  "devDependencies": {
    "@playwright/test": "^1.0.0",
    "concurrently": "^9.0.0",
    "http-server": "^14.0.0",
    "wait-on": "^8.0.0"
  }
}
```

Install once:
```bash
npm install
npx playwright install webkit
```

Then your **single command** is:
```bash
npm run dev:test
```

### Checkpoint E
Running `npm run dev:test`:
- starts the server
- launches tests (or runs them headless)
- exits with clear pass/fail

---

# 6) Hosting option A — Cloudflare Pages (free, great for static)

You have two ways:
- **Git integration** (deploy on push)
- **Direct Upload / Wrangler** (manual deploy from your machine)

## 6.1 Cloudflare Pages via Git integration (recommended)
1. Cloudflare Dashboard → **Workers & Pages** → Create → **Pages** → **Connect to Git**
2. Select your GitHub repo
3. Set build settings:
   - **Framework preset:** None / “No framework”
   - **Build command:** *(leave blank if no build step)*
   - **Build output directory:** `public` (recommended)

Cloudflare notes you can leave build command blank when no build step is needed. (Official docs)  

## 6.2 Cloudflare Pages via Wrangler (optional)
If you prefer CLI deploys, Cloudflare’s docs describe deploying a directory of static assets with `wrangler pages deploy <BUILD_OUTPUT_DIRECTORY>`.

With our structure:
```bash
npx wrangler pages deploy public
```

This yields a shareable URL like:
`https://<project>.pages.dev`

### Checkpoint CF
- Open the pages.dev URL on your phone (cellular) to verify it’s publicly reachable
- Test audio enable + chord + strum

---

# 7) Hosting option B — Netlify (free tier, very simple)

## 7.1 Netlify UI (Git deploy)
1. Netlify → Add new site → Import from Git → GitHub
2. Select repo
3. Build settings:
   - **Build command:** *(empty)*
   - **Publish directory:** `public`

Netlify docs explain build settings include build command + publish directory and that manual deploys do not run a build command.

## 7.2 Add `netlify.toml` (recommended, makes deploy reproducible)
Create `netlify.toml` in repo root:

```toml
[build]
  command = ""
  publish = "public"
```

Your deployed URL will be:
`https://<site-name>.netlify.app`

### Checkpoint NL
- Confirm `songs.html` works
- Confirm JSON loads (no CORS / no 404)
- Confirm iPad Safari can tap “Enable Audio” and play

---

# 8) Hosting option C — Vercel (free tier, works fine for static)

Vercel can deploy static sites; you’ll set it as “Other”.

## 8.1 Vercel UI (Git deploy)
1. Vercel → New Project → Import Git Repository
2. Framework preset: **Other**
3. Build command: *(empty)*
4. Output directory: `public`

Vercel’s docs describe that you can customize Build Command and other build settings in project settings.

Your deployed URL will be:
`https://<project>.vercel.app`

## 8.2 Optional `vercel.json`
You can keep it empty; for a two-page static site, you don’t need SPA rewrites.  
If you later add “clean URLs”, you can use:

```json
{
  "cleanUrls": true
}
```

### Checkpoint VC
- Confirm both `/` and `/songs` (or `/songs.html`) work as expected
- Confirm audio unlock works after user gesture

---

# 9) Which host should you choose?

**Pick one:**
- **Cloudflare Pages**: excellent global edge network; great for static.  
- **Netlify**: extremely straightforward static deploy + config file (`netlify.toml`).  
- **Vercel**: also easy, but oriented toward framework apps; static works fine.

For your project, **Cloudflare Pages or Netlify** usually feel the most “static-site-native”.

---

# 10) Make the README “one link and play” for iPad users

Update `README.md` so the **very first thing** is a single Play link.

Template:

```md
# Online‑OmniChord

## ▶ Play now (iPad / Safari)
https://YOUR_DEPLOYED_URL_HERE

### Quick start
1. Open the link in Safari (landscape).
2. Tap **Enable Audio** once.
3. Hold a chord with one finger and strum with another.
4. If anything sticks, tap **Stop All**.
```

### Checkpoint R
Ask a friend on iPad to:
- open the README
- tap the Play link
- get sound within 10 seconds

If they can’t, the README needs more explicit troubleshooting (mute switch, volume, tap Enable Audio again).

---

# 11) Optional: open‑source libraries you can add later (not required for hosting)

Keep the site lightweight; add libraries only if they solve a real problem:

- **tweakpane** (dev-only): debug sliders for audio params without touching knobs UI
- **zustand**: clean global state (control values, active chord, song mode)
- **framer-motion**: subtle pressed/active animations for a more “instrument” feel
- **tone** (Tone.js): if your rhythm engine grows complex (scheduling, transport)

Install example:
```bash
npm i zustand framer-motion lucide-react
npm i -D tweakpane
```

---

## Appendix: Minimal configs summary

### Cloudflare Pages
- Build command: *(blank)*
- Output directory: `public`

### Netlify
- Build command: *(blank)*
- Publish directory: `public`
- `netlify.toml` recommended

### Vercel
- Framework: Other
- Build command: *(blank)*
- Output directory: `public`
- `vercel.json` optional



---

## Sources (for hosting settings)

- Cloudflare Pages Git integration guide (build command can be blank when no build step) — source: Cloudflare docs. citeturn3view0
- Cloudflare Pages build configuration overview — source: Cloudflare docs. citeturn1view0turn2search1
- Cloudflare Pages Direct Upload / Wrangler deploy command (`wrangler pages deploy <BUILD_OUTPUT_DIRECTORY>`) — source: Cloudflare docs. citeturn2search14
- Netlify build settings (build command + publish directory) — source: Netlify docs. citeturn1view1
- Netlify deploys note (manual deploys do not run a build command) — source: Netlify docs. citeturn1view3
- Vercel build configuration (customizing build settings) — source: Vercel docs. citeturn1view2turn0search20
