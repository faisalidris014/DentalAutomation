# DentalFlow Showcase Script for Ilyas

> **Duration**: ~15-20 minutes | **Presenter**: Faisal | **Audience**: Ilyas
> **Goal**: Walk through every screen, every interactive element, and tell a compelling story about what DentalFlow automates for dental offices.

---

## Pre-Demo Setup

1. Open the app in Chrome (fullscreen, no bookmarks bar)
2. Make sure the role is set to **IT Admin** (top-right role switcher)
3. Clear any browser console errors
4. Have the app on `/dashboard` ready to go

---

## Act 1: The Big Picture (IT Admin View) — 3 min

### 1.1 Dashboard (`/dashboard`)
- **What to show**: You're looking at the IT Admin command center — system-wide health across all 3 clinics
- **Click/interact**:
  - Point out the **4 KPI cards** (Total Clinics, Jobs Today, Success Rate, Active Agents)
  - Scroll to **Clinic Health cards** — show green dots pulsing for online clinics (Bright Smiles, Summit Oral Surgery) and red dot for offline (North Star)
  - Click an **alert in the System Alerts timeline** — opens a detail modal with affected clinic and recommended action
  - Click **"Push Agent Update"** in the Quick Actions section — modal opens with **Agent Versions table** showing all 3 clinics. Point out Lakewood v2.3.8 is outdated (latest is v2.4.1)
  - Click **"Push Update"** button on the Lakewood row — shows loading state then confirms update
- **Story**: "As an IT admin managing multiple clinic locations, this is your single pane of glass. You see immediately that North Star is offline, Bright Smiles and Summit are running smoothly. One click into Push Agent Update shows Lakewood needs a version bump."

### 1.2 Sidebar — Clinic List
- **What to show**: Left sidebar with 3 clinics
- **Click/interact**:
  - Point out **green/red status dots** next to each clinic
  - Click the **collapse toggle** to show it collapses cleanly
  - Expand it back
- **Story**: "IT admins always see clinic health at a glance in the sidebar."

### 1.3 Alerts Dropdown (TopNav bell icon)
- **Click/interact**:
  - Click the **bell icon** in the top nav
  - Show the **unread badge count**
  - Point out the 3 most recent alerts with color-coded icons (red failures, amber denials, purple action required)
  - Click one alert — navigates to the relevant page
- **Story**: "Critical alerts bubble up immediately — failed jobs, claim denials, credential issues."

---

## Act 2: Role Switching Demo — 1 min

### 2.1 Role Switcher
- **Click/interact**:
  - Click the **role switcher** button (top-right, shows current role icon)
  - Show the dropdown with all 3 roles: IT Admin (purple), Staff Admin (cyan), Staff User (green)
  - Switch to **Staff Admin** — watch the dashboard change, sidebar disappear, nav items update
  - Switch to **Staff User** — watch further restrictions (no EOB, no Automations, no Settings)
  - Switch back to **Staff Admin** for the next section
- **Story**: "Three roles, three completely different experiences. Each user only sees what they need."

---

## Act 3: Daily Clinical Workflow (Staff Admin) — 8 min

### 3.1 Staff Admin Dashboard (`/dashboard`)
- **What to show**: Clinic-level KPIs and today's operations
- **Click/interact**:
  - Point out **4 KPI cards** with deltas (Today's Production, MTD Collections, Overdue Recalls, Unverified Insurance)
  - Show **Today's Schedule table** — hover rows to highlight, show status badges (Completed/In Progress/Confirmed)
  - Point out the **Claim Status doughnut chart** — hover segments for tooltips
  - Scroll to **Automation Activity feed** — shows recent job completions in timeline format
- **Story**: "Staff admin sees their clinic's pulse — production numbers, schedule, claim pipeline, and what the automation engine is doing in the background."

### 3.2 Patient Lookup (`/patients`)
- **Click/interact**:
  - Show the **full patient grid** — 20+ cards with avatars, insurance, balance, recall status
  - Type **"Thompson"** in the search bar — filters down to Michael, Sarah, Ethan (family)
  - Point out the color-coded **recall badges** (green = current, amber = due, red = overdue)
  - Point out **red "No Insurance"** on James Okafor's card and **amber balance** on Linda Ramirez
  - Click **Michael Thompson's card** — navigates to detail page
- **Story**: "Instant lookup across all patients. Color coding tells you who needs attention — overdue recalls in red, outstanding balances in amber, missing insurance flagged."

### 3.3 Patient Detail (`/patients/[id]` — Michael Thompson)
- **Click/interact**:
  - Show the **header** with avatar, name, DOB, gender, contact info
  - Click **copy buttons** next to phone, email, address — shows copied feedback
  - Click through all **4 tabs**:
    1. **Insurance** — show primary Delta Dental PPO card with subscriber ID, group #, plan details. Show secondary insurance slot (empty for Michael)
    2. **Appointments** — data table with 6 records showing procedure codes, providers, fees, status badges
    3. **Claims** — data table with 4 claims (mix of paid/denied status)
    4. **Communications** — timeline showing appointment reminders, insurance verifications, recall notices, statements sent
  - Click **back button** to return to patient list
- **Story**: "Everything about a patient in one place — insurance details, appointment history, claim status, and every communication sent. Staff never has to dig through multiple systems."

### 3.4 Eligibility Verification (`/eligibility`)
- **Click/interact**:
  - Show the **empty state** ("Select a Patient")
  - Click the **search bar** — type "Michael" — show autocomplete dropdown with patient name + insurance carrier
  - **Select Michael Thompson** — watch the patient insurance panel populate (avatar, name, DOB, Delta Dental details)
  - Click **"Run Eligibility Check"** button
  - **Watch the animation**: spinning loader with rotating messages ("Connecting to portal...", "Submitting patient data...", "Retrieving benefits...")
  - **Results appear** — walk through each card:
    1. **Coverage Status**: Active, PPO, In-Network badge
    2. **Benefits Summary**: Preventive 100%, Basic 80%, Major 50%, Ortho 0%
    3. **Deductible**: Progress bar showing used vs. remaining ($50 individual)
    4. **Annual Maximum**: Progress bar ($847 used of $2,000 — $1,153 remaining)
    5. **Copays**: Preventive $0, Basic $20, Major $50
    6. **Waiting Periods**: Basic: None, Major: 6 months (met), Ortho: 12 months
  - Scroll to **Verification History** — shows 3 past checks with dates and payers
- **Story**: "Instead of logging into Delta Dental's portal, entering patient info manually, and copying results back — the system does it in seconds. Real-time coverage, benefits, deductibles, maximums. All written back to the patient record automatically."

### 3.5 Recalls Management (`/recalls`)
- **Click/interact**:
  - Point out **4 KPI cards** (Total Overdue with critical count, Due This Week, Reminders Sent Today, Response Rate)
  - Click **filter pills**: All, Prophy, Perio, Child Prophy — watch the list filter with count badges
  - Show a **heavily overdue patient** (100+ days, 3/3 reminders sent, red status)
  - Click **"Send Reminder"** on a patient row — watch the button animate to loading then show "Reminder Sent" confirmation
  - Click **"Send All Reminders"** header button — triggers bulk send
  - Expand **"Automation Settings"** toggle (admin only):
    - Show 3 reminder schedules with dropdowns (1st: 7 days, 2nd: 14 days, 3rd: 30 days)
    - Change a dropdown value
    - Click **"Save Settings"** — shows confirmation
- **Story**: "Recalls are the #1 revenue leak in dental. This tracks every overdue patient, auto-sends reminders on a schedule you control, and shows you exactly who's been contacted and how many times. No more manual spreadsheets."

### 3.6 Claims Management (`/claims`)
- **Click/interact**:
  - Show the **3 tab navigation**: Submit New, Track Status, Denied / Action Required (with badge count)
  - **Submit New tab** (default):
    - Search for a patient — type "Michael" — select Michael Thompson from autocomplete
    - Show the **procedure checklist** (D2391 Composite, D0274 Bitewings, D1110 Prophy, D0120 Periodic Eval) with fees
    - Select 2-3 procedures — show the selected total calculate live
    - Click **"Submit Claim"** — watch the multi-step submission progress (steps 0-2 then confirmation)
  - Click **Track Status tab**:
    - Show the claims table with columns: Claim ID, Date, Payer, Amount, Status (color-coded badges)
    - Search/filter claims by ID or patient name
  - Click **Denied / Action Required tab**:
    - Show the badge count of denied/partial claims
    - Show a **denied claim** example: "CDT code D2392 requires tooth number" with suggestion to resubmit with tooth #30
    - Click **"Resubmit"** button — shows loading state and confirmation
- **Story**: "Submit claims in seconds — pick a patient, select procedures, one click to send. Track every claim from submission to payment. Denials aren't just flagged — the system tells you why it was denied and what to do about it. One-click resubmission."

### 3.7 EOB Retrieval (`/eob`)
- **Click/interact**:
  - Show the **last sync timestamp** in the header
  - Click **"Sync Now"** — watch the spinner animation
  - Click **payer filter pills**: All, Delta Dental, Cigna, MetLife — watch table filter
  - Point out columns: Date, Payer (color-coded badges), Patient, Check #, Billed, Allowed, Paid (green), Patient Resp
  - Click a **row** — **modal opens** with:
    - Metadata grid (payer, check #, service date, received date)
    - Detailed line items table (procedure, tooth, fee, allowed, deductible, paid, patient resp, adjustment)
    - Hover **InfoIcon tooltips** on column headers for explanations
    - Summary section at bottom
  - Click **download button** on a row — show the **toast notification** ("EOB PDF downloaded successfully")
  - Close modal with X or overlay click
- **Story**: "EOBs auto-pulled from every payer portal. No more logging into 5 different websites. Line-item detail shows exactly how each procedure was adjudicated — what was billed, what was allowed, deductibles applied, and what the patient owes."

---

## Act 4: Automation Engine — 2 min

### 4.1 Automation Jobs (`/automations`)
- **Click/interact**:
  - Point out **4 KPI cards** (Total Jobs Today, Success Rate, Currently Running, Avg Duration)
  - Show **status filter pills** with counts: Running (3), Completed (8), Failed (2), Queued (2)
  - Point out **running jobs** with animated progress bars in the status column
  - Show job types: Eligibility Check, EOB Retrieval, Claim Submission, Claim Status, Recall Reminder, Patient Sync
  - Show **"Triggered By"** column — system vs. user-initiated
  - Click a **completed job row** — navigates to detail page

### 4.2 Job Detail (`/automations/[id]`)
- **Click/interact**:
  - Show **header**: Job ID (monospace cyan), status badge
  - Point out **4 meta cards**: Type, Patient, Payer, Triggered By
  - Show **Execution Log timeline** — walk through each step:
    1. Initialize (120ms) — Job initialized for eligibility check
    2. Connect (890ms) — Connected to Delta Dental portal
    3. Authenticate (1240ms) — Authenticated with service account credentials
    4. Navigate (650ms) — Navigated to eligibility verification page
    5. Input Data (420ms) — Entered patient SSN, DOB, and subscriber ID
    6. Submit (pending) — Submitted eligibility request, waiting for response
    7. Parse (pending) — Parsing eligibility response data
  - Each step shows timestamp, status icon (green check for success, blue info for in-progress), duration
  - Click **back button** to return to jobs list
- **Story**: "Every automation job has a full audit trail. You can see exactly what the browser agent did, how long each step took, and where it failed if something went wrong. Complete transparency."

---

## Act 5: Infrastructure (IT Admin) — 2 min

### 5.1 Switch back to IT Admin role

### 5.2 Agent Monitor (`/agents`)
- **Click/interact**:
  - Point out **3 KPI cards** (Agents Online 2/3, Total Jobs Today, Latest Version)
  - Show **3 agent cards**:
    1. **Bright Smiles** — green pulsing dot, v2.4.1 (current), 47 jobs completed, OpenDental connected
    2. **Lakewood** — green dot, v2.3.8 with **"Update Available"** badge, click **"Push Update"** button
    3. **North Star** — red dot, **"Offline"** badge, OpenDental disconnected
  - Click **expand chevron** on Bright Smiles — show log timeline (info/warning/error entries with timestamps)
  - Click **"View Logs"** on North Star — show error entries: "Heartbeat failed", "OpenDental database unreachable"
- **Story**: "IT manages all clinic agents from one screen. Green means healthy, red means action needed. You can push updates remotely, view live logs, and see exactly when and why an agent went down."

### 5.3 Settings (`/settings`)
- **Click/interact**:
  - Show the **tab navigation** (IT Admin sees: Clinics, Payer Adapters, Feature Flags, Users)
  - **Clinics tab**: Show managed clinics table — name, address, phone, NPI, agent auto-update toggle, max concurrent jobs, API timeout. Click **"Configure"** on a clinic row to show the config modal
  - **Payer Adapters tab**: Show payer list with status badges (Delta Dental, Cigna, MetLife **active** — Aetna, Guardian **coming soon**). Each active payer shows supported features: Eligibility, Claims, EOB. Click **"Configure"** to show portal URL, timeout, retries, feature toggles
  - **Feature Flags tab**: Show 5 toggles — Auto EOB Retrieval, Batch Recall Reminders, Claim Status Polling, AI Denial Analysis, Patient Portal Sync
  - **Users tab**: Show staff users list with role badges. Click **"Invite User"** button to show invite modal (name, email, role, clinic)
- **Story**: "Full system configuration — managed clinics, payer integrations, feature flags, user management. Everything an IT admin needs, organized into clean tabs."

---

## Act 6: Notifications Hub — 1 min

### 6.1 Notifications Page (`/notifications`)
- **Click/interact**:
  - Show the **unread count** in subtitle
  - Click **"Mark all as read"** button
  - Click **filter pills**: All, Unread, Failures, Denials, Action Required, Info, Success
  - Show variety of notification types:
    - Red: "EOB Retrieval Failed — Patient not found in Delta Dental system"
    - Amber: "Claim Denied — Missing tooth number for D2392"
    - Purple: "Action Required — 10 Recalls Severely Overdue"
    - Cyan: "Scheduled Maintenance Window — Cigna portal maintenance upcoming"
    - Green: "Recall Reminders Sent — 12 reminders delivered"
  - Hover a notification — show **dismiss X button** appear
  - Click a notification — marks as read and navigates to related page
- **Story**: "Every important event in one feed. Filterable by type, clickable to take action. Nothing falls through the cracks."

---

## Act 7: Quick Staff User View — 1 min

### 7.1 Switch to Staff User role
- **Click/interact**:
  - Show the **simplified dashboard** — My Jobs Today, Pending Tasks, Success Rate
  - Show **Today's Schedule** and **Quick Actions** buttons (Run Eligibility, Check Claim, View Recalls)
  - Navigate to a couple pages to show restricted access
  - Try to go to Automations or Agents — show **"Access Restricted"** message
- **Story**: "Front desk staff gets a clean, focused view. Just what they need — schedule, tasks, and quick actions. No system complexity exposed."

---

## Closing — 30 sec

Switch back to IT Admin. Return to Dashboard.

**Key talking points**:
- "Every screen you just saw is production-design quality — not a wireframe, not a mockup"
- "Three distinct role experiences from one platform"
- "Automation replaces hours of manual portal work — eligibility, claims, EOBs, recalls"
- "Full audit trail on every automated action"
- "Multi-clinic management from a single IT dashboard"

---

## Interactive Element Checklist

Use this to verify every interactive element works before the demo:

### Global
- [ ] Role switcher dropdown opens/closes, switches roles correctly
- [ ] TopNav pills highlight active route
- [ ] TopNav hamburger menu works on mobile/tablet
- [ ] Alerts dropdown opens, shows notifications, navigates on click
- [ ] Sidebar collapse/expand toggle works (IT Admin only)
- [ ] Sidebar clinic status dots show correct colors

### Dashboard
- [ ] IT Admin: KPI cards render, clinic health cards clickable, alert timeline clickable, Quick Actions (Add Clinic modal, Push Agent Update modal with version table) work
- [ ] Staff Admin: KPI cards render with deltas, schedule table hover, doughnut chart tooltips, activity feed scrolls
- [ ] Staff User: KPI cards render with tooltips, quick action buttons navigate, recent jobs list shows

### Patients
- [ ] Search bar filters patient cards in real-time
- [ ] Patient cards show correct insurance/recall/balance indicators
- [ ] Clicking a card navigates to detail page
- [ ] Empty state shows when no results match
- [ ] Skeleton loading animation appears on page load

### Patient Detail
- [ ] Back button returns to patient list
- [ ] Copy buttons work for phone, email, address
- [ ] All 4 tabs switch content: Insurance, Appointments, Claims, Communications
- [ ] Insurance cards display carrier details
- [ ] Appointments table renders with status badges
- [ ] Claims table renders with status badges
- [ ] Communications timeline shows chronological events

### Eligibility
- [ ] Search bar shows autocomplete suggestions
- [ ] Selecting a patient populates the insurance panel
- [ ] "Run Eligibility Check" button triggers animation
- [ ] Loading state shows rotating messages with spinner
- [ ] Results display all 6 cards (Coverage, Benefits, Deductible, Max, Copays, Waiting Periods)
- [ ] Progress bars animate correctly
- [ ] History table shows past verifications
- [ ] Patient with no insurance shows alert/disabled check button

### Recalls
- [ ] KPI cards show correct counts
- [ ] Filter pills work (All, Prophy, Perio, Child Prophy) with count badges
- [ ] Send Reminder button animates and shows confirmation
- [ ] Send All Reminders button triggers bulk action
- [ ] Automation Settings toggle expands/collapses
- [ ] Dropdown selectors change values
- [ ] Save Settings button shows confirmation

### Claims
- [ ] Tab navigation works: Submit New, Track Status, Denied / Action Required
- [ ] Submit New: patient search autocomplete works, procedure checklist renders with fees
- [ ] Submit New: selecting procedures updates total, multi-step submission progresses correctly
- [ ] Track Status: claims table renders with color-coded status badges
- [ ] Track Status: search/filter by claim ID or patient name works
- [ ] Denied / Action Required: badge count shows on tab, denied claims list renders
- [ ] Denied: Resubmit button shows loading state and confirmation
- [ ] Denied claims show denial reason and suggested action

### EOB
- [ ] Last sync timestamp displays
- [ ] Sync Now button shows spinner
- [ ] Payer filter pills work (All, Delta, Cigna, MetLife)
- [ ] Clicking a row opens detail modal
- [ ] Modal shows metadata grid and line items table
- [ ] InfoIcon tooltips show on column header hover/click
- [ ] Summary section totals are correct
- [ ] Download button triggers toast notification
- [ ] Modal closes via X button and overlay click
- [ ] Toast auto-dismisses after 3 seconds

### Automations
- [ ] KPI cards render
- [ ] Status filter pills work with counts
- [ ] Running jobs show animated progress bars
- [ ] Clicking a row navigates to job detail
- [ ] Job detail shows meta cards, execution log timeline
- [ ] Each log step shows timestamp, status, message, duration
- [ ] Back button returns to jobs list

### Agents (IT Admin only)
- [ ] KPI cards show online count
- [ ] Agent cards show correct status (green pulse/red/amber)
- [ ] Update Available badge shows on outdated agents
- [ ] Offline badge shows on offline agents
- [ ] Expand/collapse chevron reveals log timeline
- [ ] Push Update button shows loading state
- [ ] View Logs button works
- [ ] OpenDental connection status displays correctly

### Notifications
- [ ] Unread count in subtitle matches actual unread notifications
- [ ] Mark all as read button works
- [ ] Filter pills work (All, Unread, Failures, Denials, Action Required, Info, Success)
- [ ] Notification icons are color-coded correctly (red/amber/purple/cyan/green)
- [ ] Hover reveals dismiss X button
- [ ] Clicking navigates to related page and marks as read
- [ ] Dismissed notifications disappear
- [ ] Staff User cannot see notifications linked to /agents, /settings, /automations

### Settings
- [ ] Page loads without errors
- [ ] IT Admin tabs render: Clinics, Payer Adapters, Feature Flags, Users
- [ ] Staff Admin tabs render: Clinic Profile, Payer Credentials, Notifications, Staff Users, Audit Log
- [ ] Configure Clinic modal opens and form works
- [ ] Payer Adapter configure modal opens with feature toggles
- [ ] Feature flag toggles switch on/off
- [ ] Invite User modal opens with form validation
- [ ] Role restrictions apply (Staff User cannot access)

### Responsive (Optional bonus demo)
- [ ] Resize browser to tablet — sidebar collapses, hamburger appears
- [ ] Resize to mobile — nav pills hidden, mobile menu works
- [ ] Cards reflow to single column
- [ ] Modals resize to 90vw on mobile
