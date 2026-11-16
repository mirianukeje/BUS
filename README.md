
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

## About This Project

Between Us is a senior project for the Software Development programme at Brigham Young University–Idaho.

## Favorite Quote

Olaniyi Bello's Favorite Quote:

> "Don't let your children do anything that makes you dislike them."
>
> — Jordan Peterson