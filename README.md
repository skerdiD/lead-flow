# Lead Flow

Lead Flow is a modern full-stack CRM-style SaaS app built for managing leads, tracking pipeline activity, and making the workflow more organized with AI support.

I built it with a production-style stack, focusing on authenticated dashboards, lead management, clean UI, and secure server-side logic.

## Live Demo

[View live app](https://lead-flow-lyart.vercel.app)

## Overview

Lead Flow is designed as a startup-style lead management platform where each user can:

- create and manage their own leads
- organize pipeline data inside a clean dashboard
- update lead details through validated server actions
- use an AI-powered assistant inside the app
- work in a protected authenticated experience

This project was built to show full-stack product thinking, not just separate UI pages.

## Features

- Authentication with Clerk
- Protected dashboard routes
- Lead creation, editing, and deletion
- Per-user data ownership
- AI chat assistant
- Server-side validation with Zod
- Database access with Drizzle ORM
- PostgreSQL database integration
- Bot/rate-limit protection with Arcjet
- Responsive SaaS-style UI built with reusable components

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend / Server
- Next.js App Router
- Server Actions
- API Routes
- Zod validation

### Auth / Database / Infra
- Clerk
- Drizzle ORM
- PostgreSQL
- Arcjet
- Vercel

### AI
- OpenAI via AI SDK

## Project Structure

```bash
lead-flow/
├── app/                 # App Router pages, auth pages, dashboard, API routes
├── components/          # Shared UI components
├── db/                  # Database setup and schema-related code
├── features/leads/      # Lead-focused domain logic and UI
├── lib/                 # Auth, validation, actions, utilities, protections
├── public/              # Static assets
└── README.md