# DentalFlow — Detailed Screen Designs (Text Wireframes)

**NiftyByte LLC | Every Screen, Every Element**
**Three Roles: IT Admin, Staff Admin, Staff User**

---
---

## GLOBAL LAYOUT (Present on Every Screen)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [DF] DentalFlow          │ Dashboard │ Patients │ Eligibility │ Recalls │ │
│  by NiftyByte             │ Claims │ EOB │ Automations │ Agents │ Settings│ │
│                           │                                               │
│                           │         ● API Connected    🔔 3    [IT Admin ▼]│
│                           │                                    [F. Idris] │
├───────────────────────────┼───────────────────────────────────────────────  │
│ IT Admin Sidebar          │                                               │
│ (only visible for         │           << MAIN CONTENT AREA >>             │
│  IT Admin role)           │                                               │
│                           │                                               │
│  CLINICS                  │                                               │
│  ● Bright Smiles Dental   │                                               │
│  ● Lakewood Family        │                                               │
│  ○ North Star Dental      │                                               │
│    (offline)              │                                               │
│                           │                                               │
│  [+ Add Clinic]           │                                               │
│                           │                                               │
└───────────────────────────┴───────────────────────────────────────────────  ┘
```

**Nav Behavior by Role:**

- IT Admin sees: Dashboard, Patients, Automations, Agents, Settings
- Staff Admin sees: Dashboard, Patients, Eligibility, Recalls, Claims, EOB, Automations, Settings, Notifications
- Staff User sees: Dashboard, Patients, Eligibility, Recalls, Claims, Notifications

---
---

## SCREEN 1: DASHBOARD — IT Admin View

**Route:** `/dashboard`
**Role:** IT Admin

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM OVERVIEW                                   │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ CLINICS      │  │ TOTAL JOBS   │  │ SUCCESS RATE │  │ ACTIVE       │   │
│  │ CONNECTED    │  │ TODAY        │  │              │  │ AGENTS       │   │
│  │              │  │              │  │              │  │              │   │
│  │     3        │  │    147       │  │   96.4%      │  │    2 / 3     │   │
│  │              │  │  ↑12 vs avg  │  │  ↑ 1.2%      │  │  1 offline   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ CLINIC HEALTH GRID                                                   │  │
│  │                                                                      │  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────┐ │  │
│  │  │ Bright Smiles Dental│ │ Lakewood Family     │ │ North Star      │ │  │
│  │  │                     │ │ Dentistry           │ │ Dental Group    │ │  │
│  │  │ Agent: ● Online     │ │ Agent: ● Online     │ │ Agent: ○ OFFLINE│ │  │
│  │  │ Heartbeat: 30s ago  │ │ Heartbeat: 12s ago  │ │ Last seen: 2h  │ │  │
│  │  │ Version: 1.2.4      │ │ Version: 1.2.3 ⚠    │ │ Version: 1.2.4 │ │  │
│  │  │ Queue: 3 jobs       │ │ Queue: 1 job        │ │ Queue: 8 STUCK │ │  │
│  │  │ Today: 52 complete  │ │ Today: 47 complete  │ │ Today: 0       │ │  │
│  │  │ OD: ● Connected     │ │ OD: ● Connected     │ │ OD: ? Unknown  │ │  │
│  │  │                     │ │                     │ │                 │ │  │
│  │  │ [View Logs]         │ │ [Push Update]       │ │ [Troubleshoot] │ │  │
│  │  └─────────────────────┘ └─────────────────────┘ └─────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ RECENT SYSTEM ALERTS                                    [View All →] │  │
│  │                                                                      │  │
│  │  ⚠  North Star agent disconnected                        14 min ago  │  │
│  │  ✗  Failed job: EOB retrieval — Cigna portal timeout      28 min ago  │  │
│  │  ⚠  Lakewood agent version behind (1.2.3 → 1.2.4)         2 hrs ago  │  │
│  │  ✓  Agent update pushed to Bright Smiles                   3 hrs ago  │  │
│  │  ✗  Failed job: Eligibility — Delta Dental rate limit     4 hrs ago   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  QUICK ACTIONS                                                             │
│  [+ Add Clinic]  [Push Update to All]  [View All Jobs]  [System Settings]  │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SCREEN 1B: DASHBOARD — Staff Admin View

**Route:** `/dashboard`
**Role:** Staff Admin

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Bright Smiles Dental — Dashboard                   Today: April 12, 2026  │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ TODAY'S      │  │ MTD          │  │ OVERDUE      │  │ UNVERIFIED   │   │
│  │ PRODUCTION   │  │ COLLECTIONS  │  │ RECALLS      │  │ INSURANCE    │   │
│  │              │  │              │  │              │  │              │   │
│  │  $12,450     │  │  $89,200     │  │     34       │  │     7        │   │
│  │  14 patients │  │  87% of goal │  │  ↑ 6 new     │  │  due by Mon  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────┐  ┌────────────────────────────┐  │
│  │ TODAY'S SCHEDULE                     │  │ RECALL ALERTS              │  │
│  │                                      │  │                            │  │
│  │ 8:00a  Sarah Kim                     │  │ Maria Santos — 45 days     │  │
│  │        D7210 Extraction              │  │ Prophy overdue             │  │
│  │        Dr. Patel  ● Confirmed        │  │ Last remind: 14 days ago   │  │
│  │                                      │  │ [Send SMS]                 │  │
│  │ 8:30a  James Wilson                  │  │                            │  │
│  │        D0120 Periodic Exam           │  │ Robert Chen — 32 days      │  │
│  │        D1110 Prophylaxis             │  │ Perio Maint overdue        │  │
│  │        Dr. Patel  ◐ Unconfirmed      │  │ Last remind: 7 days ago    │  │
│  │                                      │  │ [Send SMS]                 │  │
│  │ 9:00a  Lisa Martinez                 │  │                            │  │
│  │        D2740 Crown — Porcelain       │  │ Tommy Nguyen — 28 days     │  │
│  │        Dr. Thompson  ● Confirmed     │  │ Child Prophy overdue       │  │
│  │                                      │  │ No reminders sent yet      │  │
│  │ 9:30a  Carlos Reyes                  │  │ [Send Email]               │  │
│  │        D0274 Bitewings (4 films)     │  │                            │  │
│  │        D0120 Periodic Exam           │  │ + 31 more overdue          │  │
│  │        Dr. Patel  ⚠ Ins Unverified   │  │ [View All Recalls →]      │  │
│  │                                      │  ├────────────────────────────┤  │
│  │ 10:00a  David Okafor  ★ NEW PATIENT  │  │ INSURANCE VERIFY QUEUE     │  │
│  │         D0150 Comprehensive Exam     │  │                            │  │
│  │         D0210 Full Mouth X-rays      │  │ ⚠ Carlos Reyes             │  │
│  │         Dr. Thompson  ● Confirmed    │  │   Aetna PPO — Appt 9:30a  │  │
│  │                                      │  │   [Run Check]              │  │
│  │ 10:30a  Patricia Williams            │  │                            │  │
│  │         D4341 Scaling & Root Plan    │  │ ◐ Patricia Williams        │  │
│  │         Dr. Patel  ● Confirmed       │  │   MetLife PDP — Appt 10:30a│  │
│  │                                      │  │   [Run Check]              │  │
│  │ ... 8 more appointments today        │  │                            │  │
│  │ [View Full Schedule →]               │  │ + 5 more this week         │  │
│  └──────────────────────────────────────┘  │ [View All →]               │  │
│                                            └────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ AUTOMATION ACTIVITY                                     [View All →] │  │
│  │                                                                      │  │
│  │  📩  Appointment reminder sent                            2 min ago   │  │
│  │      SMS to Sarah Kim — confirmed D7210 extraction                   │  │
│  │                                                                      │  │
│  │  ✓   Insurance auto-verified                             18 min ago   │  │
│  │      Carlos Reyes — Aetna PPO eligibility confirmed                  │  │
│  │                                                                      │  │
│  │  ↻   Recall batch triggered                              6:30a today  │  │
│  │      12 SMS + 4 emails sent to overdue patients                      │  │
│  │                                                                      │  │
│  │  ★   New patient onboarded                          Yesterday 4:15p   │  │
│  │      David Okafor — welcome email + intake forms sent                │  │
│  │                                                                      │  │
│  │  $   Collections alert                              Yesterday 9:00a   │  │
│  │      Williams family — $340 balance, 60-day reminder sent            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SCREEN 1C: DASHBOARD — Staff User View

**Route:** `/dashboard`
**Role:** Staff User

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Good Morning, Jessica                              Today: April 12, 2026  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ MY JOBS TODAY                                                        │  │
│  │                                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │ SUBMITTED    │  │ COMPLETED    │  │ NEEDS ACTION │               │  │
│  │  │     4        │  │     2        │  │     1        │               │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ TODAY'S SCHEDULE                                                     │  │
│  │                                                                      │  │
│  │  8:00a   Sarah Kim — D7210 Extraction — Dr. Patel      ● Confirmed  │  │
│  │  8:30a   James Wilson — D0120, D1110 — Dr. Patel       ◐ Unconfirm  │  │
│  │  9:00a   Lisa Martinez — D2740 Crown — Dr. Thompson    ● Confirmed  │  │
│  │  9:30a   Carlos Reyes — D0274, D0120 — Dr. Patel       ⚠ Unverified │  │
│  │  10:00a  David Okafor ★ — D0150, D0210 — Dr. Thompson  ● Confirmed │  │
│  │  ... 9 more                                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  QUICK ACTIONS                                                             │
│  [Run Eligibility Check]    [Check Claim Status]    [View My Patients]     │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ RECENT ACTIVITY                                                      │  │
│  │                                                                      │  │
│  │  ✓  Eligibility check completed — Lisa Martinez / Delta Dental  10m  │  │
│  │  ✓  Claim submitted — James Wilson / Cigna DHMO / #CLM-20487   45m  │  │
│  │  ✗  Eligibility check failed — timeout on MetLife portal        1h  │  │
│  │  ✓  Eligibility check completed — David Okafor / Guardian       2h  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 2: PATIENTS — Search & List

**Route:** `/patients`
**Role:** All roles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Patients                                                                  │
│                                                                            │
│  ┌───────────────────────────────────────────────┐                         │
│  │ 🔍  Search patients by name, ID, or phone...  │                        │
│  └───────────────────────────────────────────────┘                         │
│    Showing 18 patients                                         [Filters ▼] │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ NAME              │ DOB        │ PHONE        │ INSURANCE    │ BALANCE│  │
│  ├───────────────────┼────────────┼──────────────┼──────────────┼────────│  │
│  │ Kim, Sarah        │ 03/15/1988 │ 214-555-0142 │ Delta PPO    │  $0.00 │  │
│  │ Wilson, James     │ 07/22/1975 │ 817-555-0198 │ Cigna DHMO   │ $45.00 │  │
│  │ Martinez, Lisa    │ 11/03/1992 │ 972-555-0267 │ Delta PPO    │  $0.00 │  │
│  │ Reyes, Carlos     │ 01/19/1983 │ 682-555-0334 │ Aetna PPO    │$120.00 │  │
│  │ Okafor, David ★   │ 05/30/1990 │ 469-555-0411 │ Guardian     │  $0.00 │  │
│  │ Williams, Patricia│ 09/14/1968 │ 817-555-0523 │ MetLife PDP  │$340.00 │  │
│  │ Nguyen, Tommy     │ 02/28/2014 │ —            │ Delta (dep)  │  $0.00 │  │
│  │ Santos, Maria     │ 06/07/1979 │ 214-555-0689 │ Cigna DHMO   │ $75.00 │  │
│  │ Chen, Robert      │ 12/11/1955 │ 972-555-0756 │ Medicare+    │  $0.00 │  │
│  │ Thompson, Angela  │ 08/25/1999 │ 469-555-0834 │ Aetna PPO    │  $0.00 │  │
│  │ ... 8 more patients                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Showing 1-10 of 18                                     [< Prev] [Next >]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SCREEN 2B: PATIENT DETAIL

**Route:** `/patients/[id]`
**Role:** All roles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Patients                                                        │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  [Avatar]                                                            │  │
│  │   SK        Sarah Kim                                                │  │
│  │             DOB: 03/15/1988 (Age 38)     Phone: 214-555-0142         │  │
│  │             Guarantor: Self              Email: sarah.kim@email.com  │  │
│  │             Address: 4521 Elm St, Fort Worth TX 76107                │  │
│  │                                                                      │  │
│  │  Balance: $0.00          Next Appt: Today 8:00a       Recall: Current│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  [ Insurance ]  [ Appointments ]  [ Claims ]  [ Communications ]           │
│  ─────────────                                                             │
│                                                                            │
│  ┌─── INSURANCE TAB (shown by default) ─────────────────────────────────┐  │
│  │                                                                      │  │
│  │  PRIMARY INSURANCE                                                   │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Carrier:       Delta Dental of Texas                         │  │  │
│  │  │  Plan:          PPO Plus Premier                              │  │  │
│  │  │  Subscriber:    Sarah Kim (Self)                              │  │  │
│  │  │  Subscriber ID: DDT-88401552                                  │  │  │
│  │  │  Group #:       GRP-7742                                      │  │  │
│  │  │  Effective:     01/01/2025 — 12/31/2026                       │  │  │
│  │  │  Status:        ● Active (verified 4/10/2026)                 │  │  │
│  │  │                                                               │  │  │
│  │  │  Annual Max:    $2,000    Used: $450     Remaining: $1,550    │  │  │
│  │  │  Deductible:    $50       Met: $50       Remaining: $0.00    │  │  │
│  │  │                                                               │  │  │
│  │  │  [Run Eligibility Check]                                     │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  SECONDARY INSURANCE                                                 │  │
│  │  None on file                                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── APPOINTMENTS TAB ─────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  UPCOMING                                                            │  │
│  │  04/12/2026  8:00a   D7210 Extraction   Dr. Patel    ● Confirmed    │  │
│  │                                                                      │  │
│  │  PAST (last 6 months)                                                │  │
│  │  03/15/2026  9:30a   D0120, D1110       Dr. Patel    ✓ Complete     │  │
│  │  12/10/2025  2:00p   D0274 Bitewings    Dr. Thompson ✓ Complete     │  │
│  │  09/20/2025  10:00a  D0120, D1110       Dr. Patel    ✓ Complete     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── CLAIMS TAB ───────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  DATE       │ PAYER       │ AMOUNT  │ STATUS      │ REF #           │  │
│  │  03/15/2026 │ Delta PPO   │ $245.00 │ ✓ Paid      │ CLM-19832      │  │
│  │  12/10/2025 │ Delta PPO   │ $78.00  │ ✓ Paid      │ CLM-18456      │  │
│  │  09/20/2025 │ Delta PPO   │ $245.00 │ ✓ Paid      │ CLM-17201      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── COMMUNICATIONS TAB ───────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  04/11/2026  SMS   Appointment reminder for 4/12 8:00a    Auto       │  │
│  │  04/10/2026  SMS   Appointment confirmation received      Inbound    │  │
│  │  03/01/2026  Email Recall reminder — 6-month cleaning     Auto       │  │
│  │  12/15/2025  SMS   Payment receipt — $0.00 balance        Auto       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 3: ELIGIBILITY VERIFICATION

**Route:** `/eligibility`
**Role:** Staff Admin, Staff User

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Eligibility Verification                                                  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍  Search patient to verify insurance eligibility...                │  │
│  │                                                                      │  │
│  │     Autocomplete dropdown:                                           │  │
│  │     ┌──────────────────────────────────────────┐                     │  │
│  │     │  Sarah Kim — DOB 03/15/1988              │                     │  │
│  │     │  James Wilson — DOB 07/22/1975           │                     │  │
│  │     │  Carlos Reyes — DOB 01/19/1983           │                     │  │
│  │     └──────────────────────────────────────────┘                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── After patient is selected: ──                                          │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  PATIENT INSURANCE INFO                                              │  │
│  │                                                                      │  │
│  │  Patient:      Carlos Reyes (DOB: 01/19/1983)                        │  │
│  │  Carrier:      Aetna                                                 │  │
│  │  Plan:         PPO — DMO Dental                                      │  │
│  │  Subscriber:   Carlos Reyes (Self)                                   │  │
│  │  Subscriber ID: AET-83201947                                         │  │
│  │  Group #:      GRP-5518                                              │  │
│  │                                                                      │  │
│  │  Last Verified: Never                                                │  │
│  │                                                                      │  │
│  │         [ ▶ Run Eligibility Check ]                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── After "Run Eligibility Check" is clicked (3s loading animation): ──    │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ✓ ELIGIBILITY RESULT                          Checked: Just Now     │  │
│  │                                                                      │  │
│  │  Coverage Status:   ● ACTIVE                                         │  │
│  │  Effective Dates:   01/01/2025 — 12/31/2026                          │  │
│  │                                                                      │  │
│  │  BENEFITS BREAKDOWN                                                  │  │
│  │  ┌──────────────────┬──────────┬──────────┬────────────────────────┐ │  │
│  │  │ Category         │ Coverage │ Copay    │ Notes                  │ │  │
│  │  ├──────────────────┼──────────┼──────────┼────────────────────────┤ │  │
│  │  │ Preventive       │ 100%     │ $0       │ 2x per year            │ │  │
│  │  │ Basic Restorative│ 80%      │ $0       │ after deductible       │ │  │
│  │  │ Major Restorative│ 50%      │ $0       │ after deductible       │ │  │
│  │  │ Orthodontics     │ 50%      │ $0       │ $1,500 lifetime max    │ │  │
│  │  │ Endodontics      │ 80%      │ $0       │ after deductible       │ │  │
│  │  │ Periodontics     │ 80%      │ $0       │ after deductible       │ │  │
│  │  │ Oral Surgery     │ 80%      │ $0       │ after deductible       │ │  │
│  │  └──────────────────┴──────────┴──────────┴────────────────────────┘ │  │
│  │                                                                      │  │
│  │  Annual Maximum:   $1,500    Used: $0       Remaining: $1,500       │  │
│  │  Deductible:       $50       Met: $0        Remaining: $50.00       │  │
│  │  Waiting Periods:  None                                              │  │
│  │                                                                      │  │
│  │  [Save to Patient Record]    [Print]    [Run Another Check]          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  PAST ELIGIBILITY CHECKS — Carlos Reyes                              │  │
│  │                                                                      │  │
│  │  (No previous checks on file)                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 4: RECALLS

**Route:** `/recalls`
**Role:** Staff Admin (full + settings), Staff User (full, no settings)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Recall Management                                                         │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ TOTAL        │  │ DUE THIS     │  │ REMINDERS    │  │ RESPONSE     │   │
│  │ OVERDUE      │  │ WEEK         │  │ SENT TODAY   │  │ RATE         │   │
│  │     34       │  │     8        │  │    16        │  │   62%        │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                            │
│  Filter: [All Types ▼]  [All Statuses ▼]  [Sort: Days Overdue ▼]          │
│                                                                            │
│  [☐ Select All]                                [Send Reminder to Selected] │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │☐│ PATIENT         │ TYPE       │ DAYS   │ LAST REMIND │ COUNT│STATUS │  │
│  │ │                 │            │ OVERDUE│             │      │       │  │
│  ├─┼─────────────────┼────────────┼────────┼─────────────┼──────┼───────│  │
│  │☐│ Maria Santos    │ Prophy     │ 45     │ 14 days ago │  2   │ Sent  │  │
│  │☐│ Robert Chen     │ Perio Maint│ 32     │ 7 days ago  │  1   │ Sent  │  │
│  │☐│ Tommy Nguyen    │ Child Proph│ 28     │ —           │  0   │ New   │  │
│  │☐│ Angela Thompson │ Prophy     │ 22     │ —           │  0   │ New   │  │
│  │☐│ Mike Johnson    │ Prophy     │ 18     │ 3 days ago  │  1   │ Sent  │  │
│  │☐│ Diana Park      │ Perio Maint│ 15     │ —           │  0   │ New   │  │
│  │☐│ Frank Williams  │ Prophy     │ 12     │ —           │  0   │ New   │  │
│  │☐│ Susan Lee       │ Prophy     │ 8      │ 1 day ago   │  3   │ Final │  │
│  │ │ ... 26 more rows                                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Showing 1-8 of 34                                      [< Prev] [Next >]  │
│                                                                            │
│  ── Automation Settings (Staff Admin only — hidden for Staff User) ──      │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ▼ AUTOMATION SETTINGS                                               │  │
│  │                                                                      │  │
│  │  Reminder Schedule:                                                  │  │
│  │    1st Reminder:  [ 7 ] days after due date     via [SMS ▼]          │  │
│  │    2nd Reminder:  [14 ] days after due date     via [SMS ▼]          │  │
│  │    3rd Reminder:  [30 ] days after due date     via [Email ▼]        │  │
│  │    Final Notice:  [60 ] days after due date     via [Both ▼]         │  │
│  │                                                                      │  │
│  │  Auto-send:  [● Enabled]                                            │  │
│  │  Send window: [ 8:00 AM ] to [ 6:00 PM ]                            │  │
│  │  Batch size:  [ 20 ] patients per batch                              │  │
│  │                                                                      │  │
│  │  [Save Settings]                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 5: CLAIMS — Submit New (Sub-Tab 1)

**Route:** `/claims` (sub-tab: Submit New)
**Role:** Staff Admin, Staff User (limited)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Claims Management                                                         │
│                                                                            │
│  [ Submit New ]   [ Track Status ]   [ Denied / Action Required ]          │
│  ─────────────                                                             │
│                                                                            │
│  ┌───────────────────────────────────────────────┐                         │
│  │ 🔍  Select patient to create claim...          │                        │
│  └───────────────────────────────────────────────┘                         │
│                                                                            │
│  ── After patient is selected: ──                                          │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Patient: James Wilson          Insurance: Cigna DHMO               │  │
│  │  Provider: Dr. Patel            Date of Service: 04/12/2026         │  │
│  │                                                                      │  │
│  │  SELECT PROCEDURES TO INCLUDE IN CLAIM:                              │  │
│  │                                                                      │  │
│  │  ☑  D0120 — Periodic Oral Evaluation          $65.00                │  │
│  │  ☑  D1110 — Prophylaxis (Adult Cleaning)      $125.00               │  │
│  │  ☐  D0274 — Bitewings (4 Films)               $78.00                │  │
│  │                                                                      │  │
│  │  Selected: 2 procedures          Total: $190.00                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  CLAIM PREVIEW                                                       │  │
│  │                                                                      │  │
│  │  Payer:          Cigna Dental                                        │  │
│  │  Subscriber:     James Wilson                                        │  │
│  │  Subscriber ID:  CIG-75220198                                        │  │
│  │  Group #:        GRP-3391                                            │  │
│  │  Provider:       Dr. Raj Patel, DDS     NPI: 1234567890              │  │
│  │  Facility:       Bright Smiles Dental   TIN: 12-3456789             │  │
│  │                                                                      │  │
│  │  PROCEDURES:                                                         │  │
│  │  ┌──────────┬────────────────────────────────┬─────────┬───────────┐ │  │
│  │  │ Code     │ Description                    │ Fee     │ Est. Pymt │ │  │
│  │  ├──────────┼────────────────────────────────┼─────────┼───────────│ │  │
│  │  │ D0120    │ Periodic Oral Evaluation       │ $65.00  │ $65.00    │ │  │
│  │  │ D1110    │ Prophylaxis (Adult)            │ $125.00 │ $125.00   │ │  │
│  │  ├──────────┼────────────────────────────────┼─────────┼───────────│ │  │
│  │  │ TOTAL    │                                │ $190.00 │ $190.00   │ │  │
│  │  └──────────┴────────────────────────────────┴─────────┴───────────┘ │  │
│  │                                                                      │  │
│  │              [ ▶ Submit Claim ]     [ Cancel ]                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── After submission: ──                                                   │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ✓ CLAIM SUBMITTED SUCCESSFULLY                                     │  │
│  │                                                                      │  │
│  │  Reference #:    CLM-20512                                           │  │
│  │  Patient:        James Wilson                                        │  │
│  │  Amount:         $190.00                                             │  │
│  │  Status:         Submitted — Pending Acknowledgement                 │  │
│  │                                                                      │  │
│  │  [Track This Claim]     [Submit Another]                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SCREEN 5B: CLAIMS — Track Status (Sub-Tab 2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Claims Management                                                         │
│                                                                            │
│  [ Submit New ]   [ Track Status ]   [ Denied / Action Required ]          │
│                   ──────────────                                           │
│                                                                            │
│  Filter: [All Payers ▼]  [All Statuses ▼]  [Date Range ▼]   🔍 Search     │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ PATIENT         │ PAYER       │ SUBMITTED  │ AMOUNT  │ STATUS   │ REF│  │
│  ├─────────────────┼────────────┼────────────┼─────────┼──────────┼────│  │
│  │ Wilson, James   │ Cigna DHMO │ 04/12/2026 │ $190.00 │⏳Submitted│20512│ │
│  │ Kim, Sarah      │ Delta PPO  │ 04/10/2026 │ $875.00 │⏳Processing│20498│ │
│  │ Martinez, Lisa  │ Delta PPO  │ 04/08/2026 │ $245.00 │ ✓ Approved│20467│ │
│  │ Reyes, Carlos   │ Aetna PPO  │ 04/05/2026 │ $1,200  │ ✗ Denied │20445│ │
│  │ Williams, P.    │ MetLife PDP│ 04/03/2026 │ $520.00 │ ✓ Paid   │20432│ │
│  │ Santos, Maria   │ Cigna DHMO │ 04/01/2026 │ $310.00 │ ◐ Partial│20418│ │
│  │ Okafor, David   │ Guardian   │ 03/28/2026 │ $485.00 │ ✓ Paid   │20405│ │
│  │ ... 23 more claims                                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── When a row is clicked (e.g., Sarah Kim): ──                            │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  CLAIM DETAIL — CLM-20498                                    [ ✕ ]  │  │
│  │                                                                      │  │
│  │  Patient:   Sarah Kim            Payer:     Delta Dental PPO         │  │
│  │  Provider:  Dr. Patel            Amount:    $875.00                  │  │
│  │  Submitted: 04/10/2026                                               │  │
│  │                                                                      │  │
│  │  PROCEDURES:                                                         │  │
│  │  D7210 — Extraction, Surgical         $875.00                        │  │
│  │                                                                      │  │
│  │  STATUS TIMELINE:                                                    │  │
│  │                                                                      │  │
│  │  ● Submitted ─── ● Acknowledged ─── ◐ Processing ─── ○ Adjudicated  │  │
│  │  04/10 2:15p     04/10 2:18p        04/11 9:00a      Pending        │  │
│  │                                                                      │  │
│  │  [Download Claim]    [Contact Payer]                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SCREEN 5C: CLAIMS — Denied / Action Required (Sub-Tab 3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Claims Management                                                         │
│                                                                            │
│  [ Submit New ]   [ Track Status ]   [ Denied / Action Required ]          │
│                                      ──────────────────────────            │
│                                                                            │
│  3 claims need attention                                                   │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ✗  CLM-20445 — Carlos Reyes                                        │  │
│  │     Aetna PPO | $1,200.00 | Denied 04/07/2026                       │  │
│  │                                                                      │  │
│  │     Denial Reason: Prior authorization required for D2740            │  │
│  │                    (Crown — Porcelain/Ceramic Substrate)              │  │
│  │                                                                      │  │
│  │     Suggested Action: Obtain prior auth from Aetna, then resubmit   │  │
│  │                                                                      │  │
│  │     [Resubmit Claim]    [View Full Detail]                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ◐  CLM-20418 — Maria Santos                                        │  │
│  │     Cigna DHMO | $310.00 | Partial Payment 04/05/2026                │  │
│  │                                                                      │  │
│  │     Issue: D4341 (SRP) — frequency limitation, last SRP 10/2025.    │  │
│  │            Paid $185.00 of $310.00. Patient balance: $125.00.        │  │
│  │                                                                      │  │
│  │     Suggested Action: Bill patient for $125 balance or appeal        │  │
│  │                                                                      │  │
│  │     [Send Patient Statement]    [Appeal Claim]    [View Full Detail] │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ✗  CLM-20389 — Frank Williams                                      │  │
│  │     MetLife PDP | $640.00 | Denied 03/30/2026                        │  │
│  │                                                                      │  │
│  │     Denial Reason: Missing information — tooth number not specified  │  │
│  │                    for D2750 (Crown)                                  │  │
│  │                                                                      │  │
│  │     Suggested Action: Add tooth #19 and resubmit                     │  │
│  │                                                                      │  │
│  │     [Resubmit Claim]    [View Full Detail]                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 6: EOB RETRIEVAL

**Route:** `/eob`
**Role:** Staff Admin only

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EOB Retrieval                                   Last sync: 2 hours ago    │
│                                                  [↻ Sync Now]              │
│                                                                            │
│  Date Range: [03/01/2026] to [04/12/2026]    Payer: [All Payers ▼]        │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ DATE       │PAYER      │PATIENT        │CLAIM# │BILLED  │ALLOWED│PAID│  │
│  ├────────────┼───────────┼───────────────┼───────┼────────┼───────┼────│  │
│  │ 04/09/2026 │Delta PPO  │Lisa Martinez  │20467  │$245.00 │$220.00│$176│  │
│  │ 04/05/2026 │Cigna DHMO │Maria Santos   │20418  │$310.00 │$285.00│$185│  │
│  │ 04/03/2026 │MetLife PDP│Patricia Will. │20432  │$520.00 │$520.00│$416│  │
│  │ 03/28/2026 │Guardian   │David Okafor   │20405  │$485.00 │$450.00│$360│  │
│  │ 03/25/2026 │Delta PPO  │James Wilson   │20391  │$190.00 │$190.00│$190│  │
│  │ 03/20/2026 │Aetna PPO  │Angela Thompson│20378  │$125.00 │$125.00│$125│  │
│  │ ... 14 more EOBs                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── When a row is clicked (e.g., Lisa Martinez): ──                        │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  EOB DETAIL — CLM-20467                                      [ ✕ ]  │  │
│  │                                                                      │  │
│  │  Patient:   Lisa Martinez         Payer: Delta Dental PPO            │  │
│  │  Provider:  Dr. Thompson          DOS:   04/08/2026                  │  │
│  │                                                                      │  │
│  │  LINE ITEMS:                                                         │  │
│  │  ┌───────┬──────────────────┬────────┬────────┬───────┬──────┬─────┐ │  │
│  │  │ Code  │ Description      │ Billed │ Allowed│ Paid  │ Pt Rsp│ Adj│ │  │
│  │  ├───────┼──────────────────┼────────┼────────┼───────┼──────┼─────│ │  │
│  │  │ D0120 │ Periodic Exam    │ $65.00 │ $60.00 │$60.00 │ $0   │$5.00│ │  │
│  │  │ D1110 │ Prophylaxis      │$125.00 │$110.00 │$88.00 │$22.00│$15  │ │  │
│  │  │ D0274 │ Bitewings (4)    │ $55.00 │ $50.00 │$28.00 │$22.00│$5.00│ │  │
│  │  ├───────┼──────────────────┼────────┼────────┼───────┼──────┼─────│ │  │
│  │  │ TOTAL │                  │$245.00 │$220.00 │$176.00│$44.00│$25  │ │  │
│  │  └───────┴──────────────────┴────────┴────────┴───────┴──────┴─────┘ │  │
│  │                                                                      │  │
│  │  Payment Method: EFT — Trace #847291034                              │  │
│  │  Check/EFT Date: 04/09/2026                                          │  │
│  │                                                                      │  │
│  │  [Download PDF]    [Post to OpenDental]    [Print]                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 7: AUTOMATIONS (Job Queue)

**Route:** `/automations`
**Role:** IT Admin (all clinics), Staff Admin (own clinic)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Automations                                                               │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ TOTAL JOBS   │  │ SUCCESS RATE │  │ AVG DURATION │  │ FAILURES     │   │
│  │ TODAY        │  │              │  │              │  │ TODAY        │   │
│  │    147       │  │   96.4%      │  │   2m 18s     │  │     5        │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                            │
│  Filter: [All Types ▼]  [All Statuses ▼]  [All Clinics ▼]  [Today ▼]      │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ JOB ID  │ TYPE        │ PATIENT      │ PAYER   │STATUS  │DUR  │TIME │  │
│  ├─────────┼─────────────┼──────────────┼─────────┼────────┼─────┼─────│  │
│  │ J-4821  │ Eligibility │ Carlos Reyes │ Aetna   │▶ Running│ 1m │Now  │  │
│  │         │             │              │         │ ████░░ │     │     │  │
│  │ J-4820  │ EOB Retrieve│ — (Batch)    │ Delta   │✓ Done  │3m12s│10m  │  │
│  │ J-4819  │ Claim Submit│ James Wilson │ Cigna   │✓ Done  │2m05s│15m  │  │
│  │ J-4818  │ Eligibility │ Lisa Martinez│ Delta   │✓ Done  │1m48s│22m  │  │
│  │ J-4817  │ Claim Status│ Maria Santos │ Cigna   │✓ Done  │1m30s│30m  │  │
│  │ J-4816  │ EOB Retrieve│ — (Batch)    │ MetLife │✗ Failed│4m00s│45m  │  │
│  │ J-4815  │ Eligibility │ David Okafor │ Guardian│✓ Done  │2m22s│1h   │  │
│  │ ... 140 more jobs                                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── When a job row is clicked (e.g., J-4821): ──                           │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  JOB DETAIL — J-4821                                         [ ✕ ]  │  │
│  │                                                                      │  │
│  │  Type:      Eligibility Verification                                 │  │
│  │  Patient:   Carlos Reyes                                             │  │
│  │  Payer:     Aetna PPO                                                │  │
│  │  Clinic:    Bright Smiles Dental                                     │  │
│  │  Triggered: Staff — Jessica (Manual)                                 │  │
│  │  Status:    ▶ Running (Step 3 of 5)                                  │  │
│  │                                                                      │  │
│  │  EXECUTION LOG:                                                      │  │
│  │                                                                      │  │
│  │  10:42:01  ✓ Step 1 — Connected to Aetna portal                     │  │
│  │  10:42:08  ✓ Step 2 — Logged in with clinic credentials             │  │
│  │  10:42:15  ▶ Step 3 — Navigating to eligibility lookup...           │  │
│  │  10:42:__  ○ Step 4 — Enter patient data + submit query             │  │
│  │  10:42:__  ○ Step 5 — Retrieve results + write to OpenDental        │  │
│  │                                                                      │  │
│  │  [Cancel Job]    [Retry from Step 3]                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── Example of a failed job detail (J-4816): ──                            │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  JOB DETAIL — J-4816                                         [ ✕ ]  │  │
│  │                                                                      │  │
│  │  Type:      EOB Retrieval (Batch)                                    │  │
│  │  Payer:     MetLife PDP                                              │  │
│  │  Clinic:    Bright Smiles Dental                                     │  │
│  │  Triggered: System — Scheduled (6:00 AM daily)                       │  │
│  │  Status:    ✗ FAILED at Step 3                                       │  │
│  │                                                                      │  │
│  │  EXECUTION LOG:                                                      │  │
│  │                                                                      │  │
│  │  06:00:01  ✓ Step 1 — Connected to MetLife portal                   │  │
│  │  06:00:12  ✓ Step 2 — Logged in with clinic credentials             │  │
│  │  06:00:45  ✗ Step 3 — Navigate to EOB section                       │  │
│  │                       ERROR: Portal returned maintenance page.       │  │
│  │                       "MetLife Dental Portal is currently            │  │
│  │                        undergoing scheduled maintenance.             │  │
│  │                        Please try again after 8:00 AM EST."          │  │
│  │  06:04:00  ✗ Retried 3x — all failed. Job aborted.                 │  │
│  │                                                                      │  │
│  │  [Retry Now]    [Schedule Retry]    [Dismiss]                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 8: AGENTS

**Route:** `/agents`
**Role:** IT Admin only

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Agent Monitor                                   Latest Version: 1.2.4     │
│                                                  [Push Update to All]      │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌───────────────────────┐  ┌───────────────────────┐              │   │
│  │  │  BRIGHT SMILES DENTAL │  │  LAKEWOOD FAMILY      │              │   │
│  │  │                       │  │  DENTISTRY             │              │   │
│  │  │  Status: ● ONLINE     │  │  Status: ● ONLINE     │              │   │
│  │  │  (pulsing green dot)  │  │  (pulsing green dot)  │              │   │
│  │  │                       │  │                       │              │   │
│  │  │  Heartbeat: 30s ago   │  │  Heartbeat: 12s ago   │              │   │
│  │  │  Version:   1.2.4 ✓   │  │  Version:   1.2.3 ⚠   │              │   │
│  │  │  OD Status: Connected │  │  OD Status: Connected │              │   │
│  │  │                       │  │                       │              │   │
│  │  │  Queue:    3 jobs     │  │  Queue:    1 job      │              │   │
│  │  │  Today:    52 done    │  │  Today:    47 done    │              │   │
│  │  │  Failed:   1          │  │  Failed:   0          │              │   │
│  │  │                       │  │                       │              │   │
│  │  │  [View Logs]          │  │  [Push Update] [Logs] │              │   │
│  │  └───────────────────────┘  └───────────────────────┘              │   │
│  │                                                                     │   │
│  │  ┌───────────────────────┐                                         │   │
│  │  │  NORTH STAR DENTAL    │                                         │   │
│  │  │  GROUP                │                                         │   │
│  │  │                       │                                         │   │
│  │  │  Status: ○ OFFLINE    │                                         │   │
│  │  │  (solid red dot)      │                                         │   │
│  │  │                       │                                         │   │
│  │  │  Last Seen: 2h ago    │                                         │   │
│  │  │  Version:   1.2.4 ✓   │                                         │   │
│  │  │  OD Status: Unknown   │                                         │   │
│  │  │                       │                                         │   │
│  │  │  Queue:    8 STUCK    │                                         │   │
│  │  │  Today:    0 done     │                                         │   │
│  │  │  Failed:   8          │                                         │   │
│  │  │                       │                                         │   │
│  │  │  [Troubleshoot] [Logs]│                                         │   │
│  │  └───────────────────────┘                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ── When "View Logs" is expanded for Bright Smiles: ──                     │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  AGENT LOGS — Bright Smiles Dental                           [ ✕ ]  │  │
│  │                                                                      │  │
│  │  Filter: [All Levels ▼]    [Last 1 hour ▼]                          │  │
│  │                                                                      │  │
│  │  10:42:15  INFO   Job J-4821 started: Eligibility / Aetna           │  │
│  │  10:42:08  INFO   Portal login successful: Aetna                    │  │
│  │  10:42:01  INFO   Connecting to Aetna portal...                     │  │
│  │  10:40:00  INFO   Heartbeat sent — OD connected, 3 jobs queued      │  │
│  │  10:38:22  INFO   Job J-4820 completed: EOB Retrieve / Delta        │  │
│  │  10:35:10  INFO   Job J-4820 started: EOB Retrieve / Delta          │  │
│  │  10:30:00  INFO   Heartbeat sent — OD connected, 4 jobs queued      │  │
│  │  10:28:45  WARN   Portal response slow: Delta (8.2s)                │  │
│  │  10:25:17  INFO   Job J-4819 completed: Claim Submit / Cigna        │  │
│  │  ... more log entries                                                │  │
│  │                                                                      │  │
│  │  PERFORMANCE (Last 24h)                                              │  │
│  │  Avg Job Duration:  2m 14s                                           │  │
│  │  Success Rate:      98.1%                                            │  │
│  │  Portal Logins:     47 (0 failures)                                  │  │
│  │  OD Writes:         52 (0 failures)                                  │  │
│  │  Uptime:            99.9%                                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 9: SETTINGS — IT Admin View

**Route:** `/settings`
**Role:** IT Admin

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings                                                                  │
│                                                                            │
│  [ Clinics ]  [ Payer Adapters ]  [ System ]  [ Users ]  [ Feature Flags ] │
│  ──────────                                                                │
│                                                                            │
│  ┌─── CLINICS TAB ──────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Bright Smiles Dental                            [Edit] [···] │  │  │
│  │  │  123 Main Street, Fort Worth TX 76107                         │  │  │
│  │  │  API Key: OD-BSM-***********4a7f       Agent: v1.2.4 Online  │  │  │
│  │  │  OpenDental DB: brightsmiles_od        eConnector: Active     │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Lakewood Family Dentistry                       [Edit] [···] │  │  │
│  │  │  456 Oak Avenue, Dallas TX 75201                              │  │  │
│  │  │  API Key: OD-LFD-***********8b2c       Agent: v1.2.3 Online  │  │  │
│  │  │  OpenDental DB: lakewood_od            eConnector: Active     │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  North Star Dental Group                         [Edit] [···] │  │  │
│  │  │  789 Elm Blvd, Arlington TX 76010                             │  │  │
│  │  │  API Key: OD-NSD-***********1e9d       Agent: v1.2.4 OFFLINE │  │  │
│  │  │  OpenDental DB: northstar_od           eConnector: Error      │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │  [+ Add New Clinic]                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── PAYER ADAPTERS TAB ───────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  PAYER            │ STATUS       │ FEATURES                │ ACTION  │  │
│  │  Delta Dental     │ ● Active     │ Elig, EOB, Claims       │ [Config]│  │
│  │  Cigna Dental     │ ● Active     │ Elig, EOB, Claims       │ [Config]│  │
│  │  MetLife Dental   │ ● Active     │ Elig, EOB               │ [Config]│  │
│  │  Aetna Dental     │ ◐ Beta       │ Elig only               │ [Config]│  │
│  │  Guardian Dental  │ ◐ Beta       │ Elig only               │ [Config]│  │
│  │  GEHA             │ ○ Coming Soon│ —                       │ —       │  │
│  │  United Concordia │ ○ Coming Soon│ —                       │ —       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── FEATURE FLAGS TAB ────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Auto Eligibility on Appointment Create     [● ON ]  All clinics    │  │
│  │  EOB Auto-Post to OpenDental                [○ OFF]  —              │  │
│  │  Recall Auto-Send Reminders                 [● ON ]  All clinics    │  │
│  │  AI Claim Denial Analysis                   [○ OFF]  Beta           │  │
│  │  Multi-Location KPI Rollup                  [● ON ]  IT Admin only  │  │
│  │  Patient Self-Schedule Integration          [○ OFF]  Coming Soon    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SCREEN 9B: SETTINGS — Staff Admin View

**Route:** `/settings`
**Role:** Staff Admin

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Settings — Bright Smiles Dental                                           │
│                                                                            │
│  [ Clinic Profile ]  [ Payer Credentials ]  [ Notifications ]  [ Staff ]   │
│  [ Audit Log ]                                                             │
│  ────────────────                                                          │
│                                                                            │
│  ┌─── CLINIC PROFILE TAB ───────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Clinic Name:     Bright Smiles Dental                               │  │
│  │  Address:         123 Main Street, Fort Worth TX 76107               │  │
│  │  Phone:           817-555-0100                                       │  │
│  │  Tax ID:          12-3456789                                         │  │
│  │  NPI:             1234567890                                         │  │
│  │                                                                      │  │
│  │  Business Hours:  Mon-Fri 8:00 AM — 5:00 PM                         │  │
│  │  Time Zone:       Central (CT)                                       │  │
│  │                                                                      │  │
│  │  [Edit Profile]                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── PAYER CREDENTIALS TAB ────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  PAYER            │ USERNAME          │ PASSWORD    │ LAST USED      │  │
│  │  Delta Dental     │ bsd_delta_admin   │ ••••••••••  │ Today 10:38a  │  │
│  │  Cigna Dental     │ bsd_cigna_admin   │ ••••••••••  │ Today 10:25a  │  │
│  │  MetLife Dental   │ bsd_metlife_admin │ ••••••••••  │ Today 6:00a   │  │
│  │  Aetna Dental     │ bsd_aetna_admin   │ ••••••••••  │ Today 10:42a  │  │
│  │  Guardian Dental  │ bsd_guard_admin   │ ••••••••••  │ Yesterday     │  │
│  │                                                                      │  │
│  │  [Update Credentials]  (opens modal per payer)                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── STAFF TAB ────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  NAME              │ ROLE         │ EMAIL                 │ STATUS  │  │
│  │  Faisal Idris      │ Staff Admin  │ faisal@niftybyte.com  │ Active  │  │
│  │  Jessica Park      │ Staff User   │ jessica@brightsmiles  │ Active  │  │
│  │  Monica Hernandez  │ Staff User   │ monica@brightsmiles   │ Active  │  │
│  │  Tyler Brooks      │ Staff User   │ tyler@brightsmiles    │ Invited │  │
│  │                                                                      │  │
│  │  [+ Invite Staff User]                                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌─── AUDIT LOG TAB ────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  Filter: [All Actions ▼]  [All Users ▼]  [Last 7 Days ▼]           │  │
│  │                                                                      │  │
│  │  04/12 10:42a │ Jessica Park │ Ran eligibility check │ Carlos Reyes │  │
│  │  04/12 10:25a │ Jessica Park │ Submitted claim       │ James Wilson │  │
│  │  04/12  6:30a │ System       │ Recall batch sent     │ 16 patients  │  │
│  │  04/11  4:15p │ System       │ New patient onboarded │ David Okafor │  │
│  │  04/11  2:00p │ Faisal Idris │ Updated payer creds   │ Aetna        │  │
│  │  04/11  9:00a │ System       │ Collections alert     │ P. Williams  │  │
│  │  ... more entries                                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## SCREEN 10: NOTIFICATIONS

**Route:** `/notifications`
**Role:** Staff Admin, Staff User (filtered)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Notifications                                          [Mark All as Read] │
│                                                                            │
│  Filter: [All ▼]  │  Failures (3)  │  Denials (2)  │  Action Req (4)  │   │
│                    │  Info (8)      │                                       │
│                                                                            │
│  ── UNREAD ──                                                              │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  🔴 FAILURE                                              10 min ago  │  │
│  │  Eligibility check failed — MetLife portal timeout                   │  │
│  │  Patient: Angela Thompson | Retries exhausted (3/3)                  │  │
│  │  [Retry Now]    [Dismiss]                                            │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  🟡 ACTION REQUIRED                                      28 min ago  │  │
│  │  Claim CLM-20445 denied — prior auth required                        │  │
│  │  Patient: Carlos Reyes | Payer: Aetna PPO                            │  │
│  │  [View Claim]    [Dismiss]                                           │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  🟡 ACTION REQUIRED                                        1 hr ago  │  │
│  │  Patient balance alert — 60-day overdue                              │  │
│  │  Patient: Patricia Williams | Balance: $340.00                       │  │
│  │  [View Patient]    [Send Statement]    [Dismiss]                     │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  🔴 FAILURE                                                2 hrs ago │  │
│  │  EOB retrieval failed — MetLife portal maintenance                   │  │
│  │  Batch job J-4816 | Will auto-retry at 8:00 AM                       │  │
│  │  [View Job]    [Dismiss]                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ── READ ──                                                                │
│                                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  🟢 INFO                                                  6:30a today│  │
│  │  Recall batch completed — 12 SMS + 4 emails sent                     │  │
│  │  16 patients contacted | 0 failures                                  │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  🟢 INFO                                            Yesterday 4:15p  │  │
│  │  New patient onboarded — David Okafor                                │  │
│  │  Welcome email + intake forms sent automatically                     │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  🟢 INFO                                            Yesterday 9:00a  │  │
│  │  Claim CLM-20432 paid — Patricia Williams                            │  │
│  │  MetLife PDP | Amount: $416.00 / $520.00 billed                      │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  🔵 DENIAL                                          Yesterday 8:45a  │  │
│  │  Claim CLM-20389 denied — missing tooth number                       │  │
│  │  Patient: Frank Williams | Payer: MetLife PDP                        │  │
│  │  [View Claim]                                                        │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  ... 9 more read notifications                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Showing 1-8 of 17                                      [< Prev] [Next >]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---
---

## MODAL: SEND REMINDER CONFIRMATION

**Triggered from:** Recalls screen — "Send SMS" or "Send Email" button

```
┌───────────────────────────────────────────────────┐
│  Send Recall Reminder                      [ ✕ ]  │
│                                                    │
│  Patient:   Maria Santos                           │
│  Recall:    Prophy — 45 days overdue               │
│  Channel:   SMS to 214-555-0689                    │
│                                                    │
│  MESSAGE PREVIEW:                                  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Hi Maria, this is Bright Smiles Dental.      │  │
│  │ You're overdue for your 6-month cleaning.    │  │
│  │ Call us at 817-555-0100 or reply to this     │  │
│  │ message to schedule your appointment.        │  │
│  │ — Bright Smiles Dental Team                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  This will be logged in the patient's commlog.     │
│                                                    │
│           [ Send Reminder ]     [ Cancel ]          │
└───────────────────────────────────────────────────┘
```

---

## MODAL: ADD / EDIT CLINIC

**Triggered from:** IT Admin Settings — "Add New Clinic" or "Edit"

```
┌───────────────────────────────────────────────────────┐
│  Add New Clinic                                [ ✕ ]  │
│                                                        │
│  Clinic Name:      [________________________]          │
│  Address Line 1:   [________________________]          │
│  Address Line 2:   [________________________]          │
│  City:             [____________]                      │
│  State:            [____]  ZIP: [________]             │
│  Phone:            [________________]                  │
│  Tax ID:           [________________]                  │
│  NPI:              [________________]                  │
│                                                        │
│  OPENDENTAL CONNECTION                                 │
│  API Key:          [________________________]          │
│  API Mode:         [API Service ▼]                     │
│  Database Name:    [________________________]          │
│  eConnector URL:   [________________________]          │
│                                                        │
│  AGENT CONFIGURATION                                   │
│  Agent Install Path:  [C:\DentalFlow\Agent  ]          │
│  Auto-Update:         [● Enabled ▼]                    │
│                                                        │
│              [ Save Clinic ]     [ Cancel ]             │
└───────────────────────────────────────────────────────┘
```

---

## MODAL: BULK RECALL SEND CONFIRMATION

**Triggered from:** Recalls screen — "Send Reminder to Selected"

```
┌───────────────────────────────────────────────────────┐
│  Confirm Bulk Recall Reminders                 [ ✕ ]  │
│                                                        │
│  You are about to send reminders to 5 patients:        │
│                                                        │
│  1. Maria Santos — SMS                                 │
│  2. Robert Chen — SMS                                  │
│  3. Tommy Nguyen — Email (minor, parent contact)       │
│  4. Angela Thompson — SMS                              │
│  5. Diana Park — SMS                                   │
│                                                        │
│  Channel breakdown: 4 SMS + 1 Email                    │
│                                                        │
│  All messages will be logged in patient commlogs.       │
│                                                        │
│         [ Send All 5 Reminders ]     [ Cancel ]         │
└───────────────────────────────────────────────────────┘
```

---

## EMPTY STATE: No Results

**Shown when:** Any table or list returns zero results

```
┌───────────────────────────────────────────────────────┐
│                                                        │
│                    (empty state icon)                   │
│                                                        │
│              No [items] found                          │
│                                                        │
│      Try adjusting your filters or search terms.       │
│                                                        │
│      [Clear Filters]    [Go to Dashboard]              │
│                                                        │
└───────────────────────────────────────────────────────┘
```
