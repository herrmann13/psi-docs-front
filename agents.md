# AGENTS.md - Coding Agent Instructions

> For system architecture, business rules, and module docs see the companion `agents.md`.

## 1. Build & Run Commands

Package manager is **Bun** (never npm).

```bash
bun install          # Install dependencies
bun run dev          # Local dev server (Vite)
bun run build        # Production build
bun run lint         # ESLint (flat config)
bun run preview      # Preview production build
```

There is **no test framework** configured -- no test scripts, files, or dependencies exist.
To validate changes, run `bun run build` (catches JSX/import errors) and `bun run lint`.

## 2. Environment Variables

Defined in `.env` (gitignored), consumed via `import.meta.env`:

- `VITE_API_URL` -- Backend API base URL
- `VITE_GOOGLE_CLIENT_ID` -- Google Identity client ID

## 3. Tech Stack

- React 19, React Router DOM 7, Tailwind CSS 4
- Vite via `rolldown-vite` (aliased as `vite` in package.json overrides)
- **Pure JavaScript** (no TypeScript) -- `.jsx` for files with JSX, `.js` otherwise
- No path aliases -- all imports use relative paths (`../services/api/client`)
- No component library -- all UI is hand-crafted with Tailwind utilities + inline SVGs

## 4. Project Structure

```
src/
  main.jsx                  # Bootstrap, AuthProvider, SW registration
  App.jsx                   # Routing, TopBar, RequireAuth, GlobalUiOverlay
  constants/                # Shared constant arrays/objects (UPPER_SNAKE_CASE)
  contexts/AuthContext.jsx  # Auth state via React Context + localStorage
  hooks/usePatients.js      # Patient CRUD hook with local cache
  pages/                    # Page components (*View.jsx)
  services/api/             # HTTP layer (client.js + entity services)
  storage/                  # localStorage abstraction for offline cache
  utils/uiFeedback.js       # showAlert/showConfirm via CustomEvent
  styles/globals.css        # Tailwind entry point
```

## 5. Code Style & Conventions

### 5.1 File Naming

| Category | Pattern | Example |
|----------|---------|---------|
| Pages | `PascalCaseView.jsx` | `PatientListView.jsx` |
| Hooks | `useCamelCase.js` | `usePatients.js` |
| Services/constants/utils | `camelCase.js` | `client.js`, `uiFeedback.js` |
| Contexts | `PascalCase.jsx` | `AuthContext.jsx` |

### 5.2 Import Order (double quotes always)

1. React (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`)
2. React Router DOM (`useNavigate`, `useParams`, `Link`)
3. Local constants (`../constants/...`)
4. Local services (`../services/api/...`)
5. Local hooks (`../hooks/...`)
6. Local contexts (`../contexts/...`)
7. Local utilities (`../utils/...`)
8. CSS (only in entry files)

### 5.3 Naming Conventions

- **Components**: `PascalCase`, always `export default function ComponentName()`
- **Handlers**: `handle` prefix -- `handleSubmit`, `handleChange`, `handleDelete`
- **Boolean state**: `is` prefix -- `isLoading`, `isEditing`, `isFormOpen`
- **Constants**: `UPPER_SNAKE_CASE` -- `APPOINTMENT_STATUSES`, `STORAGE_TOKEN_KEY`
- **Form defaults**: `EMPTY_FORM`, `INITIAL_FORM`, `EMPTY_PAYMENT`
- **Services**: `const xxxService = { ... }` exported object literals

### 5.4 Component Structure Pattern

```jsx
// 1. Imports (see order above)
import { useState, useEffect, useMemo } from "react";
// 2. Module-scope constants and helper functions
const EMPTY_FORM = { name: "", email: "" };
const formatValue = (v) => v.toFixed(2);
// 3. Single default export
export default function SomeView() {
  // a) useState declarations
  // b) useMemo derived state
  // c) useEffect side effects
  // d) Handler functions
  // e) Early returns (loading, not-found)
  // f) JSX return
}
```

### 5.5 Form State Pattern

```jsx
const [form, setForm] = useState(EMPTY_FORM);
const handleChange = (field) => (event) => {
  const { value } = event.target;
  setForm((current) => ({ ...current, [field]: value }));
};
```

### 5.6 State Management

- No Redux/Zustand -- `useState`/`useCallback`/`useMemo` for local state
- `AuthContext` (React Context) for auth only
- `localStorage` for session persistence and patient cache
- Custom events for cross-component communication (`auth:logout`, `ui:alert`, `ui:confirm`)

## 6. Error Handling

**API layer** (`services/api/client.js`): auto-attaches Bearer token, extracts `message` + `fieldErrors` on error, calls `showAlert()`, throws. On 401: clears localStorage, dispatches `auth:logout`.

**Page/hook level**: wrap in try/catch. If `client.js` already shows the alert, use empty catch with comment `// erro tratado globalmente no apiClient`.

**Never** use `window.alert`, `window.confirm`, or `window.prompt`. Use `showAlert`/`showConfirm` from `utils/uiFeedback.js`.

## 7. API Service Pattern

All services are thin wrappers around `apiClient`:

```js
import { apiClient } from "./client";
export const entityService = {
  list: (params) => apiClient.get(`/entities${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/entities?id=${id}`),
  create: (data) => apiClient.post("/entities", data),
  update: (id, data) => apiClient.put(`/entities/${id}`, data),
  remove: (id) => apiClient.del(`/entities/${id}`),
};
```

Note: `buildQuery` helper is duplicated in each service file.

## 8. Styling Conventions (Tailwind)

- All styling via Tailwind utility classes -- no CSS modules, no styled-components
- Page wrapper: `min-h-screen bg-slate-50 px-4 sm:px-8 sm:py-10`
- Content container: `mx-auto w-full max-w-Nxl px-4 py-8 sm:px-6 lg:px-8`
- Card: `rounded-xl bg-white p-6 shadow-sm sm:p-8`
- Primary button: `bg-slate-900 text-white hover:bg-slate-700 rounded-lg`
- Danger button: `border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`
- Disabled: `disabled:cursor-not-allowed disabled:opacity-50`
- Modal overlay: `fixed inset-0 z-N flex items-center justify-center bg-slate-900/50`
- Modal card: `max-w-md rounded-xl bg-white p-6 shadow-xl`
- Section header: `text-xs font-semibold uppercase tracking-wide text-slate-400`
- Color palette: `slate-*` (grays), `emerald-*` (success), `rose-*` (error), `amber-*` (warning)
- Font: Sora (Google Fonts); background: `#f6f1e8`
- Icons: inline SVGs (no icon library)

## 9. UI Language

All user-facing text must be in **Brazilian Portuguese (PT-BR)** -- labels, messages, buttons, statuses.

## 10. ESLint Configuration

Flat config (`eslint.config.js`):
- `@eslint/js` recommended + `react-hooks` + `react-refresh`
- `no-unused-vars`: error, with `varsIgnorePattern: "^[A-Z_]"`
- Target: ES2020, browser globals, ESM
- Ignores: `dist/`

## 11. Key Constraints

- Never expose technical IDs to the end user in the UI
- Modals must be internal components (never browser native dialogs)
- Backend is source of truth for business logic (charge creation, payment validation)
- `POST /appointments` auto-creates a linked charge -- do not call `/charges` after
- Legacy service files (`payments.js`, `paymentCharges.js`, `paymentAttachments.js`) are unused; active payment flow uses `chargesService.addPayment`
- Always use Bun, never npm
- Update docs when behavior or structure changes
