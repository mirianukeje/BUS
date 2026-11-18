
# Between Us (BUS)

**An Emotional Wellbeing and Relationship Reflection App**

## About

Between Us is a web application built around a simple idea: understanding ourselves better can help us navigate our relationships and everyday experiences more intentionally.

The app provides a space for users to check in with their emotions, write down their thoughts, reflect on situations and find better ways to communicate.

It is designed to encourage self-awareness, thoughtful reflection and healthier communication, one step at a time.

## What We're Building

Between Us will include:

- **Daily Check-ins:** A simple way to acknowledge how you're feeling.
- **Private Journal:** A space to write, revisit and manage personal reflections.
- **Guided Reflection:** Prompts to help users explore their feelings, separate facts from assumptions and think through situations.
- **Pause and Perspective:** An opportunity to consider situations from different perspectives.
- **Communication Helper:** Support with expressing thoughts and feelings more clearly.
- **Personal Insights:** A way to notice recurring emotions and themes over time.

## Technology

We're building Between Us with:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Google Gemini API (optional, planned)

## Project Status

Between Us is currently under development.

Sprint 1 includes the Next.js interface scaffold and the Supabase PostgreSQL
schema for profiles, check-ins, and journal entries. Mirian reviewed and approved
the scaffold changes. Three SQL migrations provide ownership-based Row Level
Security, required-text validation, and creation/update timestamp protection.
The developer applied the migrations manually to `between-us-dev`; migration
history must be reconciled before automated migration deployment.

The live two-user API security and timestamp suite passed with exit code 0.
ESLint, TypeScript, and the Webpack production build passed. See the
[verification evidence](docs/sprint-1-evidence.md),
[database setup guide](docs/supabase-setup.md), and
[final review](docs/sprint-1-final-review.md).

Authentication, application database integration, and guided reflection remain
separate implementation work. Sprint 1 database completion does not imply these
application features are implemented.

## Privacy Matters

Personal reflections should be treated with care.

Privacy is an important part of how we're approaching this project. We intend to ensure that users have control over their personal information and understand how their data is handled.

## Running the Project Locally

To get the project running on your computer:

1. Clone the repository.
2. Install the dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser.

## Authentication setup

Authentication uses Supabase Auth with cookie-based sessions through
`@supabase/ssr`. From the repository root, copy `.env.example` to `.env.local`
and set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the development Supabase project.
These are the project URL and publishable key only; never use a service-role or
secret key in this application. `.env.local` is ignored by Git.
The public landing page and account screens can be previewed without these
values, but registration, login, and session checks require valid project
configuration.

In the Supabase Dashboard for the intended development project:

1. Enable Email authentication. Choose whether users must confirm their email;
   the application supports both immediate sessions and confirmation-required
   signups.
2. Set the Site URL to the local app origin (`http://localhost:3000`) while
   testing locally, and add `http://localhost:3000/auth/confirm` to the
   Authentication URL Configuration redirect allow list. Add the equivalent
   deployed callback URL when configuring a deployment.
3. Keep the existing database migrations and Row Level Security policies
   enabled. No migration or signup trigger is needed: once a session exists,
   the app creates the authenticated user's own `public.profiles` row under the
   existing RLS policy. With email confirmation enabled, this happens after
   the confirmation callback exchanges the code for a session.

Restart `npm run dev` after changing environment variables. Test manually by
creating an account at `/signup`, confirming the email if requested, signing
out, and signing back in at `/login`. Invalid credentials display the Supabase
authentication error. The home page indicates the signed-in email; `/account`,
`/check-in`, and `/journal` require a valid session and return unauthenticated
visitors to login. After login, use the logout button and verify a protected
page redirects back to login. To verify data isolation, test requests with two
different normal user sessions against `profiles`, `check_ins`, and
`journal_entries`; each user's queries and writes must remain subject to the
existing RLS policies. Real registration, email delivery, and two-user RLS
verification require the configured Supabase project and cannot be established
by a local build alone.

## About This Project

Between Us is a senior project for the Software Development programme at Brigham Young University–Idaho.

## Favorite Quote

Olaniyi Bello's Favorite Quote:

> "Don't let your children do anything that makes you dislike them."
>
> — Jordan Peterson