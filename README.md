# GamePulse 2.0

GamePulse is a global English-language gaming platform built with React and Node.js. It combines a large live PC deal catalogue, limited-time giveaways and official Steam news in one responsive interface.

## What changed in 2.0

- Rebuilt visual system with a more editorial, product-led design
- Removed decorative icon packs and developer-facing labels from the interface
- Dynamic rotating hero based on live deal data
- Up to 60 live deals loaded on the first API page
- Progressive catalogue pagination for additional deal pages
- Remote title search instead of searching only the cards already loaded in the browser
- Search supplements live deals with CheapShark catalogue matches
- New live market pulse section with calculated deal statistics
- Improved keyboard search navigation with `Ctrl/Cmd + K`, arrow keys and Enter
- Expanded offline fallback feed to 24 games
- Cleaner footer without GitHub, framework or “built with” badges
- Responsive layouts for desktop, tablet and mobile

## Data sources

- Deals and catalogue search: CheapShark
- Giveaways: GamerPower
- Official game updates: Steam News

The backend uses timeouts and cached fallback content. External prices and availability must always be verified on the destination page.

## Local launch

Node.js 20.19 or newer is recommended.

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The command starts both services:

- Vite frontend: `http://localhost:5173`
- Local Node API: `http://localhost:8787`

Health check:

```text
http://localhost:8787/api/health
```

## Production check

```bash
npm run build
npm run preview
```

## Deploy to GitHub and Vercel

```bash
git init
git add .
git commit -m "Upgrade GamePulse platform"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

In Vercel:

1. Import the GitHub repository.
2. Choose the Vite framework preset.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Deploy.

Files in `/api` are deployed as Vercel Functions. The default version does not require environment variables.

## Project structure

```text
api/                    Vercel Functions
server/                 Local Node API and shared data services
src/api/                Browser API client
src/components/         React components
src/hooks/              Data, storage and animation hooks
src/styles/             Complete responsive design system
src/utils/              Formatting helpers
```
