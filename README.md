# DentalFlow Prototype

**DentalFlow** is a dental practice automation platform prototype built by [NiftyByte](https://niftybyte.com). It demonstrates end-to-end insurance workflows, patient management, claims processing, and multi-clinic IT administration through a polished, role-based UI.

This is a **front-end prototype** with mock data — no backend or database required. All interactions are simulated with realistic delays and data structures.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app defaults to the **Staff Admin** role.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19, styled-jsx |
| Language | TypeScript 5 (strict) |
| Icons | Lucide React |
| Charts | Chart.js + react-chartjs-2 |
| Fonts | DM Sans (UI), Space Mono (data) |
| State | React Context (RoleContext) |
| Data | Mock JSON with async API layer |

---

## Architecture

```
app/                    # Next.js App Router pages
  layout.tsx            # Root layout with fonts/metadata
  AppShell.tsx          # Main layout wrapper (TopNav + Sidebar + content)
  page.tsx              # Root redirect to /dashboard
  dashboard/            # Role-based dashboard views
  patients/             # Patient lookup + detail views
  eligibility/          # Insurance verification tool
  recalls/              # Recall management + automation settings
  claims/               # Claims submission, tracking, denied management
  eob/                  # Explanation of Benefits retrieval
  automations/          # Job queue monitoring
  agents/               # Local agent monitoring (IT Admin only)
  notifications/        # Alert center
  settings/             # Configuration by role

components/
  layout/
    TopNav.tsx          # Header with nav pills, alerts dropdown, role switcher
    Sidebar.tsx         # Clinic selector (IT Admin only)
    RoleSwitcher.tsx    # Role dropdown for demo purposes
    AlertsDropdown.tsx  # Mini notification preview dropdown
  screens/dashboard/
    ITAdminDashboard.tsx      # IT Admin overview
    StaffAdminDashboard.tsx   # Staff Admin overview with charts
    StaffUserDashboard.tsx    # Staff User overview with quick actions
  ui/                   # Reusable UI components
    Avatar.tsx, Badge.tsx, Card.tsx, DataRow.tsx, EmptyState.tsx,
    InfoIcon.tsx, KPICard.tsx, Modal.tsx, NavPill.tsx, ProgressBar.tsx,
    SearchBar.tsx, StatusDot.tsx, Timeline.tsx, Toast.tsx, Tooltip.tsx

context/
  RoleContext.tsx       # Role-based state management

data/mock/              # Mock JSON data files
  agents.json, appointments.json, claims.json, clinics.json,
  eobs.json, jobs.json, notifications.json, patients.json,
  payers.json, recalls.json, users.json

lib/
  mockApi.ts            # Async API layer with simulated delays
  formatters.ts         # Date, currency, phone, and time formatters

types/
  index.ts              # All TypeScript type definitions
```

---

## User Roles

DentalFlow supports three user roles, switchable via the role dropdown in the top-right corner:

### IT Admin
Full system access across all clinics. Manages infrastructure, agents, and system-wide configuration.

| Page | Access | Description |
|------|--------|-------------|
| Dashboard | Full | System-wide KPIs, clinic health cards (clickable), system alerts (clickable), quick actions (Add Clinic, Push Agent Update) |
| Patients | Full | Patient lookup across all clinics |
| Automations | Full | Job queue monitoring across all clinics |
| Agents | Exclusive | Agent monitoring with expandable logs (multiple can be open simultaneously), version management |
| Settings | Full | Clinics tab (Configure, Add Clinic), Payer Adapters (Configure), Feature Flags (toggleable), Users (Invite User) |

### Staff Admin
Clinic-level management. Handles insurance workflows, claims, and staff.

| Page | Access | Description |
|------|--------|-------------|
| Dashboard | Full | Clinic KPIs (production, collections, recalls, unverified), today's schedule, claim status chart, automation activity feed |
| Patients | Full | Patient lookup with search, detail view (insurance, appointments, claims, communications) |
| Eligibility | Full | Real-time insurance verification with animated progress |
| Recalls | Full | Recall management with send reminders, configurable automation intervals |
| Claims | Full | Submit new claims, track status (with patient search), denied claims (resubmit, document upload, view details) |
| EOB | Exclusive | EOB retrieval with sync, payer filtering, detailed line-item view |
| Automations | Full | Job queue monitoring for their clinic |
| Settings | Partial | Clinic profile (editable with save), payer credentials, notification preferences, staff users (invite), audit log |

### Staff User
Day-to-day operational access. Runs eligibility checks, manages recalls, tracks claims.

| Page | Access | Description |
|------|--------|-------------|
| Dashboard | Full | Personal KPIs with tooltips (My Jobs Today, Pending Tasks, Success Rate), today's schedule, quick actions (all functional), recent jobs |
| Patients | Full | Patient lookup and detail views with copy-to-clipboard for email and address |
| Eligibility | Full | Insurance verification tool |
| Recalls | Full | Recall management |
| Claims | Full | Claims tracking with resubmit button on denied claims |
| Notifications | Filtered | Role-filtered alerts (no agent or IT-specific notifications) |

---

## Key Features

### Navigation
- **Top Navigation**: Role-aware nav pills, responsive hamburger menu on mobile
- **Alerts Dropdown**: Split button — click "Alerts" to navigate to notifications, click chevron for a mini preview dropdown of recent alerts
- **API Status**: Green indicator showing system connectivity (visible to all roles)
- **Clinic Sidebar**: IT Admin only, shows all clinics with name/address/status columns, auto-collapses on tablet, hides on mobile

### Patient Management
- **Patient Lookup**: Searchable card grid with insurance status, balance, recall status
- **Patient Detail**: Tabbed view (Insurance, Appointments, Claims, Communications) with copy-to-clipboard on email and address
- **Gender Display**: Handles both "M"/"F" and "male"/"female" formats

### Insurance & Eligibility
- **Real-time Verification**: Animated 3-step progress (Connecting, Submitting, Retrieving)
- **Benefits Display**: Coverage status, deductible/annual max progress bars, copay breakdown, waiting periods
- **Verification History**: Table of past eligibility checks

### Claims
- **Submit New**: Patient search, procedure selection with checkboxes, claim preview, 3-step submission progress
- **Track Status**: Filterable claims table with patient search, clickable rows for detail modal
- **Denied / Action Required**: Denial reason display, suggested actions, resubmit functionality, document upload
- **Claim Detail Modal**: Works from any tab, shows timeline, line items with info tooltips, financial summary, resubmit button for denied claims
- **Info Icons**: Clickable "i" icons on column headers (Procedure, Tooth#, Fee, Allowed, Paid, Adj) explaining each field

### EOB (Explanation of Benefits)
- **EOB Table**: Filterable by payer, clickable rows for detailed view
- **Sync Now**: Animated sync with live-updating "Last sync" timestamp
- **EOB Detail Modal**: Line items with info tooltips on all columns, financial summary
- **PDF Download**: Simulated download with toast notification

### Recalls
- **KPI Summary**: Total overdue, due this week, reminders sent today, response rate
- **Recall List**: Filterable by type (Prophy, Perio, Child Prophy), individual send buttons with loading state
- **Contact Display**: Icons match contact method (email shows email address, phone shows phone number)
- **Automation Settings**: Collapsible panel with configurable reminder intervals (1st, 2nd, 3rd reminders via dropdown selectors), save functionality

### Automations
- **Job Monitor**: Table with status badges, progress bars for running jobs, duration tracking
- **Filter Pills**: All, Running, Completed, Failed, Queued (with count badges)

### Agents (IT Admin)
- **Agent Cards**: Status indicators, version management, expandable logs
- **Multiple Logs Open**: Accordion supports multiple agents open simultaneously
- **Agent Actions**: Push update functionality with loading state

### Settings
- **Editable Fields**: Text inputs for clinic profile with dirty-state detection and "Save Changes" button
- **Interactive Toggles**: Feature flags and notification preferences toggle on click
- **Invite User**: Modal with full validation (name, email, role, clinic), success/error feedback
- **Configure Clinic**: Modal with system-wide configuration fields per clinic
- **Add Clinic**: Form modal with all required fields and validation
- **Payer Adapter Config**: IT Admin can configure portal URL, timeouts, retries, enabled features per payer

### Notifications
- **Role-Based Filtering**: Staff Users don't see agent-related or IT-specific notifications
- **Interactive**: Click to navigate, dismiss button, mark all as read
- **Filter Pills**: All, Unread, Failures, Denials, Action Required, Info, Success

### Responsive Design
- **Desktop** (1280px+): Full layout with sidebar and all nav pills
- **Tablet** (768-1024px): Sidebar auto-collapses, reduced spacing
- **Mobile** (<768px): Hamburger menu, sidebar hidden, single-column layouts, touch-friendly tables
- **Small Mobile** (<480px): Further reduced fonts and padding, full-width modals

---

## Design System

- **Theme**: Dark glassmorphic with cyan (#22d3ee) accent
- **Backgrounds**: Deep navy (#0b0f1a → #1a2235 → #243049)
- **Status Colors**: Green (success), Amber (warning), Red (error), Purple (info), Cyan (accent)
- **Typography**: DM Sans for UI text, Space Mono for data/monospace
- **Effects**: Backdrop blur, subtle gradients, staggered fade-in animations, hover elevations
- **Components**: Glass cards, status dots, progress bars, nav pills, badges, modals, toasts, tooltips

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
```

---

## Project Status

This is a **UI prototype** for client demonstration purposes. All data is mock/simulated. The architecture is designed to be replaced with real API integrations when backend development begins.
