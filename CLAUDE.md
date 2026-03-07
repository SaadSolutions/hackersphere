# CLAUDE.md — Hackersphere Codebase Guide

This file provides essential context for AI assistants (and developers) working on the Hackersphere project.

---

## Project Overview

**Hackersphere** is a cybersecurity-themed web platform composed of two integrated modules:

1. **Academy** — An online learning platform for cybersecurity courses, lessons, and progress tracking.
2. **Shop** — An e-commerce store for security tools, software, hardware, and merchandise.

Both modules share a common JWT-based authentication system, coordinated through a global `ApiManager`.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| HTTP Client | axios v1.6.2 (via CDN) |
| Auth Decoding | jwt-decode v4.0.0 (via CDN) |
| Backend | RESTful API at `http://localhost:5000/api` (external, not in this repo) |
| Build Tools | None — no bundler, compiler, or transpiler |
| Package Manager | None — no npm, yarn, or lock files |

**There is no build step.** Files are served as-is. External libraries are loaded via Unpkg CDN inside HTML `<script>` tags.

---

## Repository Structure

```
hackersphere/
├── index.html              # Homepage with hero section and platform preview
├── styles.css              # Global homepage styles
├── code.js                 # Canvas-based Matrix rain animation
├── api-manager.js          # Global API coordinator (auth sync, error mgmt)
├── error-handler.js        # Global error notifications and recovery
├── api.test.js             # Manual test suite for all APIs
├── implementation_plan.md  # Feature specifications and project roadmap
│
├── academy/                # E-learning module
│   ├── api.js              # AcademyAPI class — all backend calls
│   ├── auth.js             # AcademyAuth — authentication state
│   ├── catalog.html        # Course listing page
│   ├── courses.js          # CourseCatalog — display and filtering
│   ├── course.html         # Individual course detail page
│   ├── dashboard.html      # User dashboard page
│   ├── dashboard.js        # UserDashboard — analytics and progress
│   ├── lesson.html         # Lesson viewer page
│   ├── lessons.js          # LessonViewer — lesson content display
│   ├── progress.js         # ProgressTracker — visualization and charts
│   ├── styles.css          # Academy-specific styles
│   └── utils.js            # AcademyRouter, UI utilities, formatters
│
└── shop/                   # E-commerce module
    ├── api.js              # ShopAPI class — all backend calls
    ├── cart.html           # Shopping cart page
    ├── cart.js             # CartManager — cart operations
    ├── index.html          # Store homepage
    ├── store.js            # StoreManager — catalog and filtering
    ├── styles.css          # Shop-specific styles
    └── utils.js            # Currency, validation, formatting helpers
```

---

## Key Classes & Architecture

### Global Layer

**`ApiManager`** (`api-manager.js`)
- Central coordinator for both AcademyAPI and ShopAPI
- Handles cross-module authentication token synchronization
- Implements exponential backoff retry logic for failed requests
- Provides unified error management

**`ErrorHandler`** (`error-handler.js`)
- Global error interception and display
- Toast notifications and modal dialogs for user-facing errors
- Network error detection and offline recovery

### Academy Module

| Class | File | Responsibility |
|-------|------|----------------|
| `AcademyAPI` | `academy/api.js` | All backend HTTP calls; 5-min cache TTL; retry logic |
| `AcademyAuth` | `academy/auth.js` | Auth state management, session validation on page load |
| `AcademyRouter` | `academy/utils.js` | Lightweight SPA routing without a framework |
| `CourseCatalog` | `academy/courses.js` | Course listing, search, and filtering |
| `CourseDetail` | `academy/courses.js` | Individual course information display |
| `UserDashboard` | `academy/dashboard.js` | Analytics, enrolled courses, progress summary |
| `LessonViewer` | `academy/lessons.js` | Lesson content rendering |
| `ProgressTracker` | `academy/progress.js` | Progress visualization and charting |

### Shop Module

| Class | File | Responsibility |
|-------|------|----------------|
| `ShopAPI` | `shop/api.js` | All e-commerce API calls |
| `StoreManager` | `shop/store.js` | Product catalog, search, and category filtering |
| `CartManager` | `shop/cart.js` | Shopping cart CRUD, checkout flow |

---

## Authentication

- **Method:** JWT tokens, stored in `localStorage`
- **Academy token key:** `academy_token`
- **Shop token key:** `shop_token`
- **Header format:** `Authorization: Bearer <token>`
- **Single Sign-On:** `ApiManager` synchronizes tokens between both modules so a user authenticated in the academy is also authenticated in the shop.
- **Session validation** occurs on every page load via `AcademyAuth`.

Do not introduce server-side session mechanisms or cookies — the project is stateless on the client, relying purely on localStorage JWT tokens.

---

## API Conventions

- **Base URL:** `http://localhost:5000/api` (hardcoded — no environment config)
- **Academy namespace:** `/api/academy/*`
- **Shop namespace:** `/api/shop/*`
- All requests use **axios** loaded from CDN.
- Responses are expected to be standard JSON.
- Errors are caught globally and routed through `ErrorHandler`.
- **Caching:** `AcademyAPI` caches responses for 5 minutes in memory. Clear the cache when stale data is suspected.
- **Retry logic:** Failed requests use exponential backoff (2s, 4s, 8s, 16s). Do not add additional retry layers on top.

---

## Styling Conventions

**Visual theme:** Cybersecurity "hacker" aesthetic.

| Token | Value | Usage |
|-------|-------|-------|
| Primary color | `#00ff00` | Matrix green — buttons, links, highlights |
| Background | `#000000` / dark grey | Page backgrounds |
| Accent | Gold / orange | Secondary elements |
| Font | `Courier New`, monospace | All body text |

- CSS custom properties (variables) are defined per-module in each `styles.css`.
- Glassmorphism effects are used for card and modal components.
- All layouts must be mobile-first and responsive via CSS media queries.
- The Matrix rain canvas animation on `index.html` is driven by `code.js` — do not modify it without understanding its canvas rendering loop.

---

## Testing

**Test file:** `api.test.js` (803 lines)

Tests use a custom, hand-rolled `ApiTestRunner` class — there is **no Jest, Mocha, or other test framework**. Tests must be executed manually by running the file in a browser context or with a compatible JS runtime.

### Running Tests

1. Serve the project files from a local HTTP server (e.g., `python3 -m http.server 8080`)
2. Ensure the backend API is running at `http://localhost:5000`
3. Open the browser console or load `api.test.js` to run tests
4. Results are logged to the DOM and the browser console

### Test Coverage

- `AcademyAPI` — course fetching, enrollment, progress
- `ShopAPI` — product listing, cart operations, orders
- `ApiManager` — cross-module coordination and auth sync

When adding new API methods, add corresponding test cases in `api.test.js` using the existing `ApiTestRunner` pattern.

---

## Development Workflow

### Making Changes

1. Edit HTML, CSS, or JS files directly — no compilation step needed.
2. Refresh the browser to see changes.
3. Use browser DevTools for debugging (no source maps needed).

### Adding a New Page

1. Create the HTML file in the appropriate module directory (`academy/` or `shop/`).
2. Include the module's `styles.css` and any required JS files via `<script>` tags.
3. Load `axios` and `jwt-decode` from CDN as other pages do.
4. Register any new routes in `AcademyRouter` (in `academy/utils.js`) if needed.

### Adding a New API Method

1. Add the method to the appropriate API class (`AcademyAPI` or `ShopAPI`).
2. Follow the existing pattern: async method, axios call, error propagation to `ErrorHandler`.
3. Add a cache entry if the data is read-heavy and rarely changes.
4. Add a corresponding test in `api.test.js`.

### Modifying Styles

- Global homepage styles → `styles.css` (root)
- Academy styles → `academy/styles.css`
- Shop styles → `shop/styles.css`
- Do not add inline styles; use CSS classes.
- Respect existing CSS variable names when possible.

---

## Key Conventions

- **No frameworks.** Use vanilla JavaScript. Do not introduce React, Vue, Angular, or any other framework.
- **No build tools.** Do not add webpack, Vite, Rollup, Babel, TypeScript, or npm scripts.
- **No new CDN dependencies** without confirming with the project owner.
- **Class-based JS.** All major features are implemented as ES6 classes. Follow this pattern.
- **JSDoc comments** are used throughout. Add JSDoc for any new public methods.
- **Error handling** must go through `ErrorHandler` — do not use raw `alert()` or `console.error()` for user-facing errors.
- **Authentication checks** must use `AcademyAuth` — do not read tokens directly from localStorage in new page-level code.
- **No hardcoded user data** in source files.

---

## Environment & Configuration

There are **no environment configuration files** (no `.env`, no config JSON). The API base URL is hardcoded in each API class:

```js
// academy/api.js and shop/api.js
this.baseURL = 'http://localhost:5000/api';
```

To change the backend URL during development, update this value directly in both `academy/api.js` and `shop/api.js`.

---

## Git Workflow

- **Active development branch:** `claude/claude-md-mmgc0xrrsgvpp5u9-XDNB3`
- **Main branch:** `master`
- Remote: configured to a local proxy — push with `git push -u origin <branch-name>`
- No CI/CD pipelines, no GitHub Actions, no pre-commit hooks

Commit messages should be clear and descriptive, referencing the module affected (e.g., `academy: add lesson progress persistence`, `shop: fix cart quantity update`).

---

## What to Avoid

- Do not introduce server-side rendering or a Node.js backend to this repo.
- Do not add a `package.json` or install npm packages — use CDN only.
- Do not use `localStorage` for sensitive data beyond tokens (which is already established practice).
- Do not use `eval()` or `innerHTML` with unsanitized user input — XSS risk.
- Do not use `document.write()`.
- Do not duplicate API logic between `AcademyAPI` and `ShopAPI` — share via `ApiManager` or utility functions where possible.
- Do not break the Matrix animation on `index.html` — it is a key visual element.
