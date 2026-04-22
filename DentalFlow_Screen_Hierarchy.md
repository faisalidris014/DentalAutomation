# DentalFlow by NiftyByte — Screen Hierarchy & Navigation Map

---

## Roles

All screens are scoped to one of three user roles. The navigation itself changes based on role.

| Role | Description |
|------|-------------|
| **IT Admin** | NiftyByte internal. Manages all connected clinics, agents, system health. Sees everything. |
| **Staff Admin** | Clinic-level admin (office manager). Manages their own clinic's automations, settings, and users. |
| **Staff User** | Front desk / billing staff. Day-to-day operations only. No automation config, no settings beyond personal. |

---

## Global Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  TOPBAR                                                          │
│  [DF Logo]  DentalFlow by NiftyByte                              │
│                                                                  │
│  Nav Pills: [Dashboard] [Patients] [Eligibility] [Recalls]      │
│             [Claims] [EOB] [Automations] [Agents] [Notifications]│
│                                                                  │
│  Right: [API Status ●] [Role Switcher ▾] [Clinic Selector ▾]    │
│         [User Avatar]                                            │
├──────────────────────────────────────────────────────────────────┤
│  SIDEBAR (IT Admin only — collapsible)                           │
│  ├── Connected Clinics                                           │
│  │   ├── Bright Smiles Dental        ● Online                    │
│  │   ├── Lakewood Family Dentistry   ● Online                    │
│  │   └── North Star Dental Group     ○ Offline                   │
│  ├── System Health                                               │
│  └── Settings (gear icon)                                        │
├──────────────────────────────────────────────────────────────────┤
│  MAIN CONTENT AREA                                               │
│  (Screen-specific content renders here)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Navigation Visibility by Role

```
Screen                    IT Admin    Staff Admin    Staff User
─────────────────────────────────────────────────────────────
/dashboard                  ✔            ✔              ✔
/patients                   ✔            ✔              ✔
/patients/:id               ✔            ✔              ✔
/eligibility                ✔            ✔              ✔
/recalls                    ✔            ✔              ✔
/claims                     ✔            ✔              ✔ (limited)
/eob                        ✔            ✔              ✗
/automations                ✔            ✔              ✗
/automations/:id            ✔            ✔              ✗
/agents                     ✔            ✗              ✗
/notifications              ✔            ✔              ✔ (filtered)
/settings                   ✔            ✔              ✗
```

---

## Full Screen Hierarchy

```
DentalFlow
│
├── /dashboard ─────────────────────────── Main Dashboard
│   ├── [IT Admin View]
│   │   ├── System KPIs (clinics, jobs, success rate, agents)
│   │   ├── Clinic Health Grid
│   │   ├── System Alerts Feed
│   │   └── Quick Actions (Add Clinic, Push Update)
│   │
│   ├── [Staff Admin View]
│   │   ├── Clinic KPIs (production, collections, recalls, insurance)
│   │   ├── Today's Appointment Schedule
│   │   ├── Automation Activity Feed
│   │   ├── Recall Alerts Sidebar
│   │   └── Insurance Verification Queue
│   │
│   └── [Staff User View]
│       ├── Today's Schedule (personal)
│       ├── My Jobs Today
│       ├── Recent Jobs
│       └── Quick Actions (Run Eligibility, Check Claim)
│
├── /patients ──────────────────────────── Patient Lookup
│   ├── Search Bar (autocomplete)
│   ├── Patient Results Table
│   └── /patients/:id ─────────────────── Patient Detail
│       ├── [Tab] Overview
│       │   ├── Demographics
│       │   ├── Contact Info
│       │   └── Primary Provider
│       ├── [Tab] Insurance
│       │   ├── Primary Plan
│       │   ├── Secondary Plan (if any)
│       │   ├── Subscriber Info
│       │   └── Eligibility History
│       ├── [Tab] Appointments
│       │   ├── Upcoming
│       │   └── Past (with procedure codes)
│       ├── [Tab] Claims
│       │   ├── Active Claims
│       │   └── Claim History
│       ├── [Tab] Financials
│       │   ├── Balance Summary
│       │   ├── Aging Breakdown (0-30, 31-60, 61-90, 90+)
│       │   ├── Payment History
│       │   └── Statements Sent
│       └── [Tab] Communications
│           ├── Comm Log (all SMS, email, calls)
│           └── Send New Message (modal)
│
├── /eligibility ───────────────────────── Eligibility Verification
│   ├── Patient Search Bar
│   ├── Selected Patient Insurance Panel
│   │   ├── Carrier, Plan, Subscriber ID, Group #
│   │   └── [Run Eligibility Check] button
│   ├── Result Card (after check)
│   │   ├── Coverage Status (Active/Inactive/Terminated)
│   │   ├── Effective Dates
│   │   ├── Copay Amounts by Category
│   │   ├── Deductible Remaining
│   │   ├── Annual Max Remaining
│   │   └── Waiting Periods
│   ├── Batch Verification Panel (Staff Admin only)
│   │   ├── Select Date Range of Appointments
│   │   ├── [Run Batch] button
│   │   └── Batch Progress Bar
│   └── Verification History Table
│       ├── Patient, Carrier, Date Checked, Result, Checked By
│       └── Click row → re-view result card
│
├── /recalls ───────────────────────────── Recall Management
│   ├── Summary Bar
│   │   ├── Total Overdue
│   │   ├── Due This Week
│   │   ├── Reminders Sent Today
│   │   └── Response Rate %
│   ├── Recall Table (sortable, filterable)
│   │   ├── Patient, Recall Type, Due Date, Status, Last Contact, # Reminders
│   │   └── Row Actions: [Send Reminder] [Schedule] [Dismiss]
│   ├── Bulk Actions Toolbar
│   │   ├── Select All / Select Filtered
│   │   ├── [Send Batch Reminders] (SMS + Email)
│   │   └── [Export List]
│   └── Automation Settings Panel (Staff Admin only)
│       ├── Reminder Intervals (1st, 2nd, 3rd reminder timing)
│       ├── Channel Preferences (SMS, Email, Both)
│       ├── Auto-Send Toggle (on/off)
│       └── Message Templates (editable)
│
├── /claims ────────────────────────────── Claims Management
│   ├── [Sub-Tab] Submit New
│   │   ├── Patient Search
│   │   ├── Completed Procedures List (from OpenDental)
│   │   ├── Select Procedures for Claim
│   │   ├── Auto-Populated Claim Form Preview
│   │   │   ├── Payer, Subscriber, Provider
│   │   │   ├── Procedure Codes, Fees, Tooth #
│   │   │   └── Diagnosis Codes
│   │   └── [Submit Claim] button → Confirmation with Ref #
│   │
│   ├── [Sub-Tab] Track Status
│   │   ├── Claims Table
│   │   │   ├── Patient, Payer, Date Submitted, Amount, Status, Ref #
│   │   │   └── Status: Submitted / Processing / Approved / Denied / Partial
│   │   └── Click row → Claim Detail View
│   │       ├── Claim Timeline (submitted → acknowledged → adjudicated → paid)
│   │       ├── Line Items with amounts
│   │       └── Payer Notes
│   │
│   └── [Sub-Tab] Denied / Action Required
│       ├── Filtered list of claims needing attention
│       ├── Denial Reason displayed per claim
│       ├── Suggested Action
│       └── [Resubmit] / [Appeal] buttons
│
├── /eob ───────────────────────────────── EOB Retrieval (Staff Admin only)
│   ├── Date Range Picker + Payer Filter
│   ├── EOB Table
│   │   ├── Date, Payer, Patient, Claim #
│   │   ├── Amount Billed, Allowed, Paid, Patient Resp, Adjustment
│   │   └── Click row → EOB Detail View
│   │       ├── Line-by-line procedure breakdown
│   │       ├── Allowed vs. Billed comparison
│   │       ├── Write-off amounts
│   │       └── [Download PDF] button
│   ├── Sync Status Indicator ("Last sync: 2 hours ago")
│   └── [Sync Now] button
│
├── /automations ───────────────────────── Automations / Job Queue (Staff Admin + IT Admin)
│   ├── Job Queue Table
│   │   ├── Job ID, Type, Clinic, Patient, Status, Started, Duration
│   │   ├── Status: Queued / Running / Completed / Failed / Retrying
│   │   └── Type: Eligibility Check / Reminder Send / Claim Submit / EOB Sync / Recall Batch
│   ├── Filters: Status, Type, Date Range, Clinic (IT Admin)
│   ├── /automations/:id ──────────────── Job Detail
│   │   ├── Job Summary Card (type, clinic, patient, timestamps)
│   │   ├── Step-by-Step Execution Log
│   │   │   ├── Step 1: Pull patient data from OpenDental ✔
│   │   │   ├── Step 2: Query payer portal ✔
│   │   │   ├── Step 3: Parse response ✔
│   │   │   └── Step 4: Write back to OpenDental ✔
│   │   ├── Error Details (if failed)
│   │   │   ├── Error message
│   │   │   ├── Stack trace (IT Admin only)
│   │   │   └── [Retry] button
│   │   └── Raw API Logs (IT Admin only, collapsible)
│   └── Automation Schedules Panel (Staff Admin)
│       ├── Scheduled Jobs List
│       ├── Cron-style schedule display
│       └── [Enable/Disable] toggles
│
├── /agents ────────────────────────────── Agent Monitor (IT Admin only)
│   ├── Agent Cards (one per clinic)
│   │   ├── Clinic Name
│   │   ├── Agent Status (Online ● / Offline ○ / Error ▲)
│   │   ├── Last Heartbeat timestamp
│   │   ├── Agent Version
│   │   ├── Jobs in Queue count
│   │   ├── CPU / Memory usage
│   │   └── [View Logs] [Restart] [Push Update] buttons
│   ├── Agent Logs View (expandable per agent)
│   │   ├── Timestamped log entries
│   │   ├── Severity: INFO / WARN / ERROR
│   │   └── Filter by severity
│   └── System-wide Controls
│       ├── [Push Update to All] button
│       ├── Agent Version Management
│       └── Connection Health History Chart
│
├── /notifications ─────────────────────── Notification Center
│   ├── Notification List (chronological, grouped by day)
│   │   ├── Icon + Title + Timestamp
│   │   ├── Description
│   │   ├── Action Link (e.g., "View Claim", "Check Patient")
│   │   └── Read/Unread indicator
│   ├── Filter by Type
│   │   ├── Claim Denials
│   │   ├── Eligibility Failures
│   │   ├── Agent Alerts (IT Admin only)
│   │   ├── Payment Received
│   │   ├── Recall Responses
│   │   └── System Errors (IT Admin only)
│   └── [Mark All Read] [Clear All] buttons
│
└── /settings ──────────────────────────── Settings (IT Admin + Staff Admin)
    ├── [IT Admin View]
    │   ├── [Tab] Clinics
    │   │   ├── Connected Clinics List
    │   │   ├── [Add Clinic] flow
    │   │   │   ├── Clinic Name, Address, Phone
    │   │   │   ├── OpenDental API Key + Developer Key
    │   │   │   ├── eConnector URL
    │   │   │   └── [Test Connection] → [Save]
    │   │   └── Edit / Remove Clinic
    │   ├── [Tab] Payers
    │   │   ├── Configured Payer Portals
    │   │   ├── [Add Payer] (name, portal URL, credential type)
    │   │   └── Credential Management (encrypted)
    │   ├── [Tab] Users
    │   │   ├── User List with Roles
    │   │   ├── [Invite User] (email, role, clinic assignment)
    │   │   └── Edit / Deactivate User
    │   ├── [Tab] System
    │   │   ├── Feature Flags / Toggles
    │   │   ├── API Rate Limits
    │   │   ├── Webhook Configuration
    │   │   └── HIPAA Audit Log (searchable)
    │   └── [Tab] Billing
    │       ├── Subscription Status
    │       ├── Usage Metrics (API calls, jobs run)
    │       └── Invoice History
    │
    └── [Staff Admin View]
        ├── [Tab] Clinic Profile
        │   ├── Clinic Info (name, address, phone, NPI)
        │   └── Business Hours
        ├── [Tab] Users
        │   ├── Staff Users at this clinic
        │   └── [Invite Staff User]
        ├── [Tab] Communication Templates
        │   ├── Appointment Reminder (SMS + Email)
        │   ├── Recall Reminder (SMS + Email)
        │   ├── Collections Notice (Email)
        │   ├── Welcome Packet (Email)
        │   └── [Edit Template] (WYSIWYG editor)
        ├── [Tab] Automation Rules
        │   ├── Reminder timing
        │   ├── Auto-verify insurance (on/off)
        │   ├── Collections alert thresholds (30/60/90 day)
        │   └── Recall batch schedule
        └── [Tab] Audit Log
            ├── Action, User, Timestamp, Details
            └── Filter by date, user, action type
```

---

## Modal / Overlay Screens

These are not standalone routes but appear as overlays triggered from various screens.

```
Modals & Overlays
│
├── Patient Quick View ──────── Triggered from any patient name click
│   ├── Name, DOB, Phone, Email
│   ├── Insurance summary (carrier + plan)
│   ├── Next Appointment
│   ├── Outstanding Balance
│   └── [Go to Full Profile] link
│
├── Send Message Modal ──────── Triggered from patient detail or recall actions
│   ├── Recipient (pre-filled)
│   ├── Channel: SMS / Email toggle
│   ├── Template Selector dropdown
│   ├── Message Body (editable, pre-filled from template)
│   └── [Send] / [Cancel] buttons
│
├── Eligibility Result Modal ── Triggered after running eligibility check
│   ├── Full coverage breakdown
│   ├── Category-by-category copay/coinsurance
│   ├── Frequency limitations
│   └── [Save to Patient Record] / [Print] / [Close]
│
├── Claim Detail Modal ──────── Triggered from claims table row click
│   ├── Claim header (patient, payer, ref #)
│   ├── Procedure line items
│   ├── Status timeline
│   └── [Resubmit] / [Appeal] / [Close]
│
├── Job Detail Modal ────────── Triggered from automation job row click
│   ├── Job execution steps with checkmarks
│   ├── Duration per step
│   ├── Error detail (if failed)
│   └── [Retry] / [Close]
│
├── Add Clinic Wizard ───────── Triggered from Settings > Clinics > Add Clinic
│   ├── Step 1: Clinic Info (name, address, phone)
│   ├── Step 2: OpenDental Connection (API key, dev key, eConnector URL)
│   ├── Step 3: Test Connection → results
│   └── Step 4: Confirmation + [Save]
│
├── Invite User Modal ───────── Triggered from Settings > Users > Invite
│   ├── Email Address
│   ├── Role Selector (Staff Admin / Staff User)
│   ├── Clinic Assignment (multi-select for IT Admin)
│   └── [Send Invite] / [Cancel]
│
└── Confirmation Dialogs ────── Triggered by destructive actions
    ├── "Are you sure?" with action description
    └── [Confirm] / [Cancel]
```

---

## Navigation Flow Diagram

```
                            ┌─────────────┐
                            │   LOGIN      │
                            └──────┬───────┘
                                   │
                          Role detected from auth
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼               ▼
              ┌──────────┐  ┌──────────┐   ┌──────────┐
              │ IT Admin │  │Staff Admin│   │Staff User│
              │Dashboard │  │Dashboard │   │Dashboard │
              └────┬─────┘  └────┬─────┘   └────┬─────┘
                   │             │              │
     ┌─────────────┼─────┐      │         ┌────┼────┐
     ▼             ▼     ▼      │         ▼    ▼    ▼
  Agents     All Screens Settings    Patients Elig. Recalls
  (exclusive)  (all access)  │       Claims  Notifs
                             │       (limited)
                    ┌────────┼────────┐
                    ▼        ▼        ▼
                Patients  Eligibility Recalls
                Claims    EOB        Automations
                Notifs    Settings
```

---

*Document Version: 1.0 — April 2026*
*NiftyByte LLC — DentalFlow Product Architecture*
