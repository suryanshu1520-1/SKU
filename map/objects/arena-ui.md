---
type: object
status: verified 2026-08-18
universe: live
---

# Object: Arena UI (`Arena.tsx`, `Autopsy.tsx`, State Persistence)

## 1. What It Is
The high-stakes examination interface comprising the timed quiz player, question navigation grid, live timer, submission barrier, and the autopsy review dashboard.

## 2. Why This Shape
- **Amnesia Prevention**: Quiz and autopsy states are backed by `localStorage` so switching navigation tabs or accidentally reloading does not erase candidate progress.
- **Sterile Focus**: High-contrast, minimal distraction aesthetic tailored for intense analytical examination conditions.

## 3. Shape & Citations
- **Arena Component**: [`src/components/Arena.tsx:L1-L200`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx#L1-L200)
- **Autopsy Component**: [`src/components/Autopsy.tsx:L1-L150`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Autopsy.tsx#L1-L150)
- **App Controller**: [`src/App.tsx:L30-L120`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/App.tsx#L30-L120)

## 4. Connected To
- **Consumes**: `static_questions`, `pyq_prelims` (from `/api/questions` or `/api/training-questions`).
- **Produces**: Submissions to `/api/submit-quiz`.

## 5. If You Change This
- **Hits**: [`src/App.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/App.tsx), [`src/components/Autopsy.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Autopsy.tsx).
- **Does not hit**: Backend database schema or cron workers.

## 6. Surfaces
- **Written by**: Candidate interaction in browser.
- **Read by**: Candidate in browser.

## 7. See
- Source: [`src/components/Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx)
- Doc: [`docs/architecture.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/architecture.md)
