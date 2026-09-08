---
name: project-scaler-airbnb
description: SCALER project - Airbnb clone fullstack app. FastAPI backend + Next.js 16 frontend. Current state and key decisions.
metadata:
  type: project
---

Airbnb clone fullstack assignment at /Users/anveshmishra/Developer/SCALER/.

**Why:** SDE fullstack assignment requiring real auth, search, booking, hosting CRUD, UI matching Airbnb.

**How to apply:** Reference when working on this project. Key paths and decisions below.

## Backend (/backend)
- FastAPI + SQLite (at data/airbnb.db), Python venv at .venv/
- JWT auth via python-jose + passlib[bcrypt]
- Auth endpoints: POST /api/v1/auth/signup, /auth/login, GET /auth/me
- Bearer token auth (Authorization: Bearer <token>) — NOT X-User-Id header
- File upload: POST /api/v1/upload → saves to data/uploads/, served at /uploads/
- Seed: python -m app.database.seed (demo passwords: password123)
- Demo accounts: priya@example.com (HOST), vikram@example.com (GUEST)

## Frontend (/frontend)
- Next.js 16 + Tailwind CSS v4 + TypeScript
- AuthContext (JWT stored in localStorage), ThemeContext (dark/light via html.dark class)
- Dark mode: globals.css html.dark { } overrides CSS vars, Tailwind dark: prefix via @custom-variant
- Key rule: use explicit dark:text-[#f2f2f2] etc. NOT just semantic classes for critical text — Tailwind v4 may resolve CSS vars at build time for some properties
- Design tokens in globals.css @theme block, matching DESIGN.md

## Important Note on Tailwind v4 + dark mode
Tailwind v4 semantic color classes (text-ink, bg-canvas) use CSS variables. For critical foreground text that must be visible in dark mode, ALSO add explicit dark:text-[#f2f2f2] as a belt-and-suspenders approach, because Tailwind v4 may resolve CSS variable values at build time for certain color functions.
