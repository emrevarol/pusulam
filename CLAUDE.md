# Pusulam — Turkiye'nin Kolektif Zeka Platformu

## What is this?
Manifold+Metaculus hybrid prediction market for Turkey. Users predict outcomes of real-world events using virtual currency "Kurus" (NOT real money). Positioned as "Kolektif Zeka Platformu", never as gambling/betting.

## Core Concepts
- **Currency**: Kurus (sanal para) — NOT real money. Never convertible to cash.
- **Market Mechanism**: CPMM (Constant Product Market Maker) — prices change based on buy/sell volume
- **Reputation**: Metaculus-style calibration score + badges + Pro Tahminci status
- **Predictions**: Users can submit probability estimates with reasoning (Metaculus-style)
- **Categories**: Ekonomi, Siyaset, Teknoloji, Gundem, Dunya (NO sports betting — avoids Iddaa/gambling law)
- **Auth**: Required (next-auth credentials)
- **i18n**: Turkish (default) + English (next-intl)
- **Design**: Clean, minimal, teal/emerald accent (NOT red — distance from betting sites)

## FORBIDDEN — Legal Compliance
- NEVER use words: bahis, kumar, sans, oran (betting/gambling terms)
- NEVER add sports match outcome markets (Iddaa territory = Law 7258)
- NEVER allow Kurus to be converted to real money
- NEVER add casino-style animations or "hot streak" gamification

## Tech Stack
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Prisma 7 + PostgreSQL (pusulam DB)
- next-intl (tr/en)
- next-auth v4 (credentials)
- @prisma/adapter-pg for DB connection

## How to Run
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use 20.19.0
npm run dev
# → http://localhost:3000
```

## Demo Accounts (all password: test123)
- admin@pusulam.ai (ADMIN)
- emre@pusulam.ai (PRO)
- ali@test.com / zeynep@test.com / mehmet@test.com (USER)

## Database
- PostgreSQL 16 on localhost:5432, database: pusulam
- Prisma config: prisma.config.ts (url in datasource)
- Schema: prisma/schema.prisma
- Seed: prisma/seed.ts

## Domain
- pusulam.ai (to be purchased)
