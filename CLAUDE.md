# StreakPact

Two-person accountability check-in app for CP and JX.
Migrating from a Google Sheets workflow to a web app (PWA).

## Stack
- Frontend: React + Vite + TypeScript (from Lovable scaffold)
- PWA: vite-plugin-pwa
- Backend: Supabase (Auth + PostgreSQL + RLS)
- Hosting: Vercel
- No separate API server

## Key context
- Only 2 users (CP and JX), both fixed accounts
- Supabase Auth handles login (email/password)
- All CRUD goes through Supabase client SDK, protected by Row Level Security
- Settlement logic (weekly/monthly) is computed client-side, not server-side
- Week starts on Monday
- Current Lovable code uses Zustand with localStorage — needs to be replaced with Supabase client calls

## Code conventions
- TypeScript strict mode
- Functional React components with hooks
- Supabase client initialized in src/lib/supabase.ts
- Types auto-generated from Supabase schema via `supabase gen types`
- Keep components small, one concern per file

## What NOT to do
- No Firebase
- No separate backend API (ASP.NET, Express, etc)
- No SSR/Next.js — this is a Vite SPA
- No unnecessary abstractions for 2 users
- Don't over-engineer auth (no roles, no teams, no invite flow)

## Reference docs
- docs/DECISIONS.md — all locked design decisions
- docs/ARCHITECTURE.md — data flow and schema
- docs/SUPABASE_SCHEMA.md — tables, RLS policies, seed data
- docs/ROADMAP.md — phased implementation plan
