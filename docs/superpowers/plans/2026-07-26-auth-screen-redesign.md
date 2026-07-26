# Auth Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `src/app/auth.tsx` into a high-end "Sử Việt Hoàng Gia" styled Auth screen with custom badge header, elevated card container, smooth pill tab switching, input focus state feedback, and Guest Mode.

**Architecture:** Single React Native screen using existing theme context (`useThemeColors`), custom UI primitives (`Screen`, `Button`), and Ionicons.

**Tech Stack:** React Native, Expo Router, TypeScript, Ionicons, `@/contexts/ThemeContext`, `@/constants/theme`.

## Global Constraints

- Preserve all existing Firebase Auth & Session logic (`loginWithUsername`, `register`, `resetPassword`, `getUserById`, `saveUserSession`, `onLoginSuccess`).
- Use `useThemeColors` for dynamic Light/Dark mode colors.
- Use `HTML_SHADOWS` and `BORDER_RADIUS` from `@/constants/theme`.

---

### Task 1: Redesign Auth Screen UI Component

**Files:**
- Modify: `src/app/auth.tsx:1-574`

**Interfaces:**
- Consumes: `useAuth()`, `useThemeColors()`, `loginWithUsername()`, `register()`, `resetPassword()`, `saveUserSession()`
- Produces: Enhanced `AuthScreen` default export with royal Sử Việt aesthetic.

- [ ] **Step 1: Update AuthScreen state & handlers in `src/app/auth.tsx`**

Add state for focused input (`focusedInput`) and Guest Mode handler (`handleGuestMode`).

- [ ] **Step 2: Update Header & Hero section rendering**

Render 3D-styled logo emblem badge with golden glow, app title "Lịch Sử Việt Nam", subtitle "Hành trình khám phá 4.000 năm Lịch sử Việt Nam", and feature tags.

- [ ] **Step 3: Update Segmented Pill Tab Switcher**

Render pill tabs for Login/Register with active background highlight, bold typography, and smooth touch opacity.

- [ ] **Step 4: Update Inputs with Focus Glow & Error Banner**

Wrap inputs in `inputContainer` with conditional border color (`focusedInput === key ? colors.secondary : colors.border`). Add optional Error Banner view for error messaging.

- [ ] **Step 5: Add Guest Mode Button**

Add "Trải nghiệm không cần đăng nhập" button below form that navigates directly to `/(tabs)/period`.

- [ ] **Step 6: Verify TypeScript build**

Run typecheck command: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 7: Commit changes**

```bash
git add src/app/auth.tsx
git commit -m "feat(auth): redesign login and register screen with Sử Việt Hoàng Gia theme"
```
