<div align="center">

# 🔭 GitFinder

### Search GitHub's 300M+ repositories by idea — not exact name.

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-gitfinder--five--sandy.vercel.app-black?style=for-the-badge)](https://gitfinder-five-sandy.vercel.app/)
[![Built with Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

<br/>

> Type a concept like `"image compression"` or `"expense tracker"` — GitFinder ranks the best repos with quality scoring, date filters, README previews, and live trending data.

<br/>

![GitFinder Preview](https://gitfinder-five-sandy.vercel.app/og-preview.png)

**[🌐 Open App](https://gitfinder-five-sandy.vercel.app/)** · **[📦 Report Bug](https://github.com/YOUR_USERNAME/gitfinder/issues)** · **[✨ Request Feature](https://github.com/YOUR_USERNAME/gitfinder/issues)**

</div>

---

## 📌 Table of Contents

- [✨ Features](#-features)
- [🔍 How It Works](#-how-it-works)
- [🏗️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Environment Variables](#️-environment-variables)
- [📁 Project Structure](#-project-structure)
- [🧠 Quality Scoring Algorithm](#-quality-scoring-algorithm)
- [🔐 Security Model](#-security-model)
- [☁️ Deploy Your Own](#️-deploy-your-own)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🔍 **Concept Search** | Type 1–3 words (e.g. `"drag drop ui"`) — no exact names needed |
| 📅 **Date Filters** | Filter by Today / This Week / 2024 / 2023 / All Time |
| 🏆 **Quality Scoring** | Repos rated Advanced / Intermediate / Basic using 9 signals |
| 📄 **Inline README Viewer** | Read full README without leaving the app |
| 📈 **Trending Page** | Top repos by category in the last 30 days |
| 🌐 **Live Site Detection** | Repos with deployed websites are flagged automatically |
| 🎨 **Mouse Trail + Transitions** | Smooth animated UI with page transitions |
| ⚡ **Token-Secured API** | GitHub token lives server-side only — never exposed to browser |

---

## 🔍 How It Works

```
User Input → /api/github (Next.js Route Handler) → api.github.com → Ranked Results
```

1. You type a search query or pick a trending category
2. The frontend calls your own `/api/github` proxy route
3. The server injects your `GITHUB_TOKEN` and forwards the request to GitHub's API
4. Results are scored using 9 quality signals and returned to the client
5. You can filter by date, language, quality level, and read READMEs inline

**Why the proxy?** GitHub allows only **60 req/hour** unauthenticated. With a token, you get **5,000 req/hour** — and the token never touches the browser.

---

## 🏗️ Tech Stack

- **[Next.js 14](https://nextjs.org/)** — App Router, API Route Handlers
- **[TypeScript 5](https://www.typescriptlang.org/)** — Full type safety
- **[Tailwind CSS 3](https://tailwindcss.com/)** — Utility-first styling
- **[GitHub REST API](https://docs.github.com/en/rest)** — Repository search & data
- **[Vercel](https://vercel.com/)** — Deployment & environment variable hosting

---

## 🚀 Quick Start

### Prerequisites

- Node.js `18+`
- A GitHub Personal Access Token ([get one here](https://github.com/settings/tokens/new) — no scopes needed for public repos)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/gitfinder.git
cd gitfinder
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and add your GitHub token:

```env
GITHUB_TOKEN=ghp_your_token_here
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ Yes | GitHub Personal Access Token. [Generate here](https://github.com/settings/tokens/new). No scopes needed for public repo search. |

> 🔒 This variable is only accessed server-side in `/app/api/github/route.ts`. It is **never** sent to the browser.

---

## 📁 Project Structure

```
gitfinder/
├── app/
│   ├── page.tsx              # Main UI — search + trending
│   ├── layout.tsx            # Root layout + metadata
│   ├── globals.css           # Global styles
│   └── api/
│       └── github/
│           └── route.ts      # Server-side GitHub API proxy
├── components/
│   ├── RepoCard.tsx          # Individual repository card
│   ├── DetailModal.tsx       # Repo detail overlay
│   ├── ReadmeModal.tsx       # Inline README viewer
│   ├── PageTransition.tsx    # Animated page transitions
│   ├── MouseTrail.tsx        # Cursor trail effect
│   └── CommitTicker.tsx      # Live commit activity ticker
├── lib/
│   └── github.ts             # API logic, scoring, types, filters
├── .env.example              # Environment variable template
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## 🧠 Quality Scoring Algorithm

Each repository is scored out of 100 using 9 signals:

| Signal | Points |
|--------|--------|
| ⭐ Stars (10k+) | 30 |
| 🍴 Forks (1k+) | 15 |
| 🕐 Last push < 7 days | 15 |
| 🏷️ Topic count | up to 10 |
| 🌐 Has live deployed site | 10 |
| 📝 Description length | up to 8 |
| 📜 Has license | 5 |
| 📚 Has wiki | 4 |
| 🐛 Issue health ratio | 3 |

**Tiers:**

- 🟢 **Advanced** — 55+ points
- 🟡 **Intermediate** — 28–54 points
- 🔴 **Basic** — < 28 points

---

## 🔐 Security Model

- `GITHUB_TOKEN` is stored in Vercel's encrypted environment variable store
- The token is only read inside `app/api/github/route.ts` — a server-only Next.js Route Handler
- The browser calls `/api/github` (your own domain), not `api.github.com` directly
- Token is never exposed in browser DevTools, network tab, or client-side bundles
- You can revoke the token from GitHub at any time without redeploying

---

## ☁️ Deploy Your Own

### Option A — Vercel (Recommended, 5 minutes)

1. Fork this repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your fork
3. Add environment variable:
   - **Key:** `GITHUB_TOKEN`
   - **Value:** your `ghp_...` token
4. Click **Deploy** ✅

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
# When prompted for env variables, add GITHUB_TOKEN
```

### Option C — Self-Hosted

```bash
npm run build
npm start
# Set GITHUB_TOKEN in your server environment
```

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

Made with ❤️ and deployed at → **[gitfinder-five-sandy.vercel.app](https://gitfinder-five-sandy.vercel.app/)**

</div>