# Sonartra MVP Engine App

Engine-first foundation for Sonartra's MVP web application using Next.js App Router + TypeScript.

## Project Purpose

Sonartra is being built with one canonical assessment engine, one execution path, and one result contract. The first flagship assessment is WPLP-80, and runtime behavior will be driven by seeded database data.

## Core Principles

- One engine
- One execution path
- One result contract
- Deterministic outputs only
- No UI-side scoring
- No runtime Excel/JSON package parsing

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- ESLint + Prettier

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## High-Level Architecture

- `app/(public)` for public site pages
- `app/(user)/app/*` for user application routes
- `app/(admin)/admin/*` for admin application routes
- `lib/engine` reserved for the canonical engine runtime
- `lib/server` + `lib/db` for backend orchestration and data access
- `types` for shared contracts and status models

## Current Scope

This repository state is Task 1 foundation only. Scoring, normalization, result building, schema implementation, and auth integrations are intentionally deferred.
