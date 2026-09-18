# AGENTS.md — Agent Directives & Instructions

## 🎯 Primary Directives for Frontend & UI/UX Work

1. **MANDATORY READING**:
   Before modifying or adding ANY frontend code, you **MUST** read [FRONTEND_UI_UX_ARCHITECTURE.md](file:///c:/Users/mohit/coding/startup%20idea/Otium%20uni%20hub/FRONTEND_UI_UX_ARCHITECTURE.md). It contains the master specification for:
   - Complete frontend architecture flows for Web (Next.js 14) and Mobile (React Native / Expo 54).
   - The 4 core platform themes and step-by-step instructions on how to add new themes.
   - Component library parity map (Web shadcn/ui ↔ Mobile custom UI components).
   - Screen UX rules, anti-spam submission cooldowns, offline synchronization, and long-post read-more / full-screen views.
   - Motion design, spring physics, and micro-animations.

2. **MANDATORY DOCUMENT UPDATE AFTER EVERY FRONTEND EDIT**:
   After performing **ANY** frontend changes (such as creating new screens, modifying theme tokens, updating components, adding animation primitives, or changing layouts), you **MUST** update [FRONTEND_UI_UX_ARCHITECTURE.md](file:///c:/Users/mohit/coding/startup%20idea/Otium%20uni%20hub/FRONTEND_UI_UX_ARCHITECTURE.md) to keep documentation completely synchronized.

3. **NAMING CONVENTIONS (LEAN BRANDING)**:
   Never reintroduce legacy names in user-facing UI:
   - ❌ `Hostel Printing` / `Hostel Print` ➔ ✅ **`Express Printing`** or **`Express Print Station`**
   - ❌ `Incognito Wall` / `Incognito Post` ➔ ✅ **`Whisper Wall`** / **`Anonymous Whisper`**
   - ❌ `Incognito Handle` ➔ ✅ **`Whisper Wall Alias`** or **`Anonymous Alias`**

4. **THEME DISCIPLINE**:
   - Never hardcode color hex codes or raw color classes (`bg-black`, `text-white`, `text-gray-400`).
   - Web: Always use semantic CSS variables (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-primary`, `bg-secondary`, `bg-destructive`).
   - Mobile: Always consume `colors` from `useTheme()`.

## ⚙️ Primary Directives for Backend & API Work

1. **MANDATORY READING**:
   Before modifying, creating, or extending ANY backend code, Server Actions, API routes, Prisma schemas, or storage handlers, you **MUST** read [BACKEND_ARCHITECTURE.md](file:///c:/Users/mohit/coding/startup%20idea/Otium%20uni%20hub/BACKEND_ARCHITECTURE.md). It contains the master specification for:
   - Dual-gateway architecture (Web Server Actions ↔ Mobile REST API Route Handlers).
   - Unified Google OAuth pipeline (`POST /api/auth/google`), 30-day Bearer JWTs, and NextAuth session cookies.
   - Database schema, multi-campus tenant isolation (`collegeId`), and dynamic service kill-switches (`CampusService`).
   - The Strict Integer Paise Currency Rule (`1 INR = 100 Paise`).
   - Zero-Knowledge Anonymity and Cryptographic Blind IDs (`getBlindParticipantId`).
   - Managed proxy escrow state machine, 50/50 advance-settlement, and anti-hoarding limits.
   - Offline attendance bulk reconciliation algorithm (`syncOfflineAttendance`).
   - Supabase storage PDF page counting (`pdf-lib`), 60s signed print tokens, and automated pruning.

2. **MANDATORY DOCUMENT UPDATE AFTER EVERY BACKEND EDIT**:
   After performing **ANY** backend changes (such as adding endpoints, altering Server Actions, changing Prisma models, or updating rate limits), you **MUST** update [BACKEND_ARCHITECTURE.md](file:///c:/Users/mohit/coding/startup%20idea/Otium%20uni%20hub/BACKEND_ARCHITECTURE.md) to keep documentation completely synchronized.

3. **VERIFICATION BEFORE CONCLUDING**:
   - Validate schema: `npx prisma validate`.
   - Web: Run `npx tsc --noEmit` in root.
   - Mobile: Run `npx tsc --noEmit` in `mobile/`.
   - Ensure 0 errors across all checks.

4. **GIT POLICY**:
   - Do NOT run `git commit` or `git push` unless explicitly commanded by the user ("will do the git part later"). Keep changes in the working directory.

