# Tark 1.0 (SKU)

> Minimalist, analytical competitive examination testing arena and AI-driven current affairs intelligence platform.

---

## ⚡ Overview

**Tark 1.0** provides civil services and competitive examination aspirants with an analytical, high-stakes testing environment coupled with automated, daily PIB & current affairs distillation powered by LLMs (Gemini / Llama 3).

### Key Capabilities

- **Analytical Test Arena**: Timed quiz simulation, negative marking, instant autopsy analysis, question breakdown, and performance metrics.
- **AI Distillation Pipeline**: Continuous RSS & PIB news scraping, deduplication, and structured markdown synthesis.
- **Gamification & Social Metrics**: Global leaderboard, streaks, XP calculation, percentile rankings, and user profiles.
- **Monetization & Concurrency**: Tiered subscriptions (Freemium / Pro) with Razorpay integration and atomic checkout seat reservation.
- **ICM Architecture & Obsidian Graph**: Fully structured with Interpretable Context Methodology (System Map) and clean Obsidian vault integration.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
Create `.env` and `.env.local` with the required keys:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
CRON_SECRET=your-cron-secret
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Running Locally
```bash
# Start development server (Express + Vite)
npm run dev

# Run typechecks and linting
npm run lint
```

---

## 📂 Repository Navigation

- **[CLAUDE.md](file:///c:/Users/bentn/OneDrive/Desktop/SKU/CLAUDE.md)** / **[AGENTS.md](file:///c:/Users/bentn/OneDrive/Desktop/SKU/AGENTS.md)**: Agent routing catalog.
- **[CONTEXT.md](file:///c:/Users/bentn/OneDrive/Desktop/SKU/CONTEXT.md)**: Workspace architectural contract.
- **[Vault Map.md](file:///c:/Users/bentn/OneDrive/Desktop/SKU/Vault%20Map.md)**: Visual knowledge hub for Obsidian.
- **[docs/](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs)**: System manuals, API references, and database schemas.
- **[map/](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map)**: ICM System Map (verified object cards, process workflows, change impact).
