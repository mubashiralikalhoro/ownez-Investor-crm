# Zoho CRM Provider Implementation Guide

**For:** IT developer implementing `lib/providers/zoho.ts`
**Time estimate:** 5-8 working days
**Prerequisite reading:** `DESIGN-SPEC.md` Sections 2, 12, and 13

---

## 0. What You're Building & How to Verify It

### The Goal

You are building a single file — `lib/providers/zoho.ts` — that implements the `DataService` interface (`lib/types.ts`). This file replaces the mock provider (`lib/providers/mock.ts`) so the CRM reads/writes from Zoho CRM instead of in-memory data.

**One env var switches providers:** Set `DATA_PROVIDER=zoho` in `.env.local` and the entire app uses Zoho. Set `DATA_PROVIDER=mock` (or omit it) to use mock data. The UI code never changes.

### What Already Works

The entire frontend is built and tested against the mock provider:
- 94 Playwright E2E tests cover every screen and workflow
- 33 provider-level tests verify every DataService method
- All UI, API routes, and business logic are complete

**Your job is to make the same tests pass with `DATA_PROVIDER=zoho`.**

### The DataService Interface

Your Zoho provider must implement every method in the `DataService` interface. The full interface is in `lib/types.ts` (lines 312-400). Key method groups:

| Group | Methods | Count |
|-------|---------|-------|
| People | getPeople, getPerson, createPerson, updatePerson, searchPeople | 5 |
| Activities | getActivities, getRecentActivities, createActivity | 3 |
| Organizations | getOrganizations, searchOrganizations, createOrganization | 3 |
| Funding Entities | getFundingEntities, createFundingEntity | 2 |
| Funded Investments | getFundedInvestments, createFundedInvestment | 2 |
| Relationships | getReferrerForProspect, getRelatedContacts, addReferrer, addRelatedContact, removeRelatedContact, getReferrals | 6 |
| Dashboard | getDashboardStats | 1 |
| Leadership | getLeadershipStats, getMeetingsCount, getFunnelData, getSourceROI, getDrilldownProspects, getDrilldownActivities, getTopReferrers, getRedFlags | 8 |
| Users | getUsers, getUserByUsername | 2 |
| Lead Sources | getLeadSources, createLeadSource, updateLeadSource, reorderLeadSources, getLeadSourceCounts | 5 |
| Admin Users | updateUserPermissions, deactivateUser, getUnassignedProspects | 3 |
| System Config | getSystemConfig, updateSystemConfig | 2 |
| Pipeline Config | getPipelineStageConfigs, updatePipelineStageConfig | 2 |
| Activity Config | getActivityTypeConfigs, updateActivityTypeConfig, createActivityType | 3 |
| **Total** | | **47** |

### Testing Strategy — Three Phases

#### Phase 1: Provider Test Kit (as you build each method)

A standalone test suite that calls DataService methods directly — no browser, no dev server.

```bash
# Run against mock (verify the test kit works):
npx tsx scripts/test-provider.ts

# Run against Zoho (verify your implementation):
DATA_PROVIDER=zoho npx tsx scripts/test-provider.ts
```

This runs 33 tests covering every method group. Each test:
1. Calls the method
2. Validates the response shape (correct fields, correct types)
3. Validates basic behavior (filters work, creates return IDs, etc.)

**Use this as you build.** Implement `getPeople()` → run the test kit → 1 more test passes. Repeat for each method.

#### Phase 2: E2E Tests (after all methods implemented)

The existing 94 Playwright E2E tests exercise the full UI → API → DataService → Zoho pipeline.

```bash
# Start dev server with Zoho provider:
DATA_PROVIDER=zoho npm run dev

# In another terminal, run all E2E tests:
npx playwright test
```

These tests log in as Chad/Eric/Ken, navigate screens, create prospects, log activities, check dashboard stats, etc. If they pass with `DATA_PROVIDER=zoho`, the integration is complete.

**Important:** E2E tests that create/modify data need a way to reset Zoho to a known state. Options:
1. **Zoho Sandbox** — use a sandbox org that can be reset
2. **Seed script** — before each test run, bulk-delete test records and re-seed (see below)
3. **Isolated test records** — prefix test data with `[TEST]` and clean up after

#### Phase 3: Data Parity Check (final validation)

Run both providers and compare outputs:

```bash
# The test kit prints results for both providers:
npx tsx scripts/test-provider.ts > mock-results.txt
DATA_PROVIDER=zoho npx tsx scripts/test-provider.ts > zoho-results.txt
diff mock-results.txt zoho-results.txt
```

Both should show 33/33 passing. Any diff indicates a method that behaves differently.

### Zoho Sandbox Seed Data

The mock provider ships with specific test data (see `lib/providers/mock.ts`). To run E2E tests against Zoho, your sandbox needs equivalent records:

| Entity | Key Records | Purpose |
|--------|-------------|---------|
| People | David Thornton (Pitch, $500K), Robert Calloway (Active Engagement), Angela Torres (KYC/Docs), Nathan Blake (Nurture), Michael Park (Dead) | Cover all pipeline stages |
| Organizations | Calloway Family Office, Thornton Capital, Torres Family Office | Org relationships |
| Funding Entities | Torres Family Trust (linked to Angela Torres) | Entity panel |
| Funded Investments | At least 1 with amountInvested, investmentDate in current year | Dashboard/leadership stats |
| Activities | Mix of calls, emails, meetings, notes across multiple prospects | Timeline, dashboard, leadership |
| Users | Chad Cormier (rep), Ken Warsaw (marketing), Eric Gewirtzman (admin) | Auth + role-based access |
| Referrer Links | At least 1 referrer → prospect link | Top Referrers panel |
| Related Contacts | Mrs. Calloway linked to Robert Calloway | Related contacts panel |

The full mock data set is in `lib/providers/mock.ts` — you can reference it line-by-line for exact field values.

### Recommended Build Order

Build and test in this order (matches the test kit groups):

1. **OAuth + `zohoFetch()` utility** — token refresh, base URL, error handling
2. **People** — the foundation; most other methods depend on person records
3. **Activities** — needed for dashboard stats and timeline
4. **Organizations** — simple CRUD, tests org relationships
5. **Funding Entities + Investments** — needed for AUM/funded stats
6. **Relationships** — referrer links, related contacts
7. **Dashboard + Leadership** — aggregation methods (depend on 2-6)
8. **Users** — auth integration
9. **Admin Config** — lead sources, pipeline stages, activity types, system config
10. **Communication Integrations** — telephony, email sync (Phase 3, can be deferred)

After each group, run: `DATA_PROVIDER=zoho npx tsx scripts/test-provider.ts`

---

## 1. Prerequisites

### Zoho CRM Edition

- **Zoho CRM Professional or higher** is required (custom modules + API access).
- Confirm the existing instance has Zoho PhoneBridge active and O365 email sync configured. You do NOT need to set these up — they are already running. You only need to READ the data they produce.

### OAuth Setup (Self Client)

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Click **Add Client** > **Self Client**
3. Enter a name (e.g., `OwnEZ CRM Frontend`)
4. Copy the **Client ID** and **Client Secret**
5. Generate a refresh token:
   - Scope: `ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.READ,ZohoCRM.coql.READ`
   - Time Duration: 10 minutes
   - Description: `OwnEZ CRM server-to-server`
   - Click **Create** — copy the authorization code
6. Exchange the code for a refresh token:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=YOUR_AUTH_CODE"
```

Response includes `refresh_token` (does not expire) and `access_token` (expires in 1 hour).

### Required OAuth Scopes

| Scope | Purpose |
|---|---|
| `ZohoCRM.modules.ALL` | CRUD on all modules (People, Organizations, Activities, etc.) |
| `ZohoCRM.settings.ALL` | Read picklist values, module metadata |
| `ZohoCRM.users.READ` | Read CRM user list (for Assigned Rep mapping) |
| `ZohoCRM.coql.READ` | COQL queries for dashboard aggregations and cross-module queries |

### Environment Variables

Set these in `.env.local` (local) and Vercel project settings (production):

```env
DATA_PROVIDER=zoho
ZOHO_CLIENT_ID=1000.XXXXXXXXXX
ZOHO_CLIENT_SECRET=XXXXXXXXXX
ZOHO_REFRESH_TOKEN=1000.XXXXXXXXXX.XXXXXXXXXX
ZOHO_ORG_ID=XXXXXXXXXX
ZOHO_API_BASE=https://www.zohoapis.com/crm/v6
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
```

> **Note:** If the Zoho instance is on a regional data center (EU, IN, AU, JP, CA), replace `zoho.com` and `zohoapis.com` with the regional domain (e.g., `zoho.eu`, `zohoapis.eu`).

---

## 2. File to Create

Create `lib/providers/zoho.ts` implementing the `DataService` interface defined in `lib/data.ts`.

The existing data layer (`lib/data.ts`) already has a provider loader that checks `DATA_PROVIDER`. You need to:

1. Create `lib/providers/zoho.ts` exporting a `ZohoProvider` class that implements `DataService`
2. Update the provider loader in `lib/data.ts` to import it:

```typescript
// In lib/data.ts — add the zoho case:
if (providerType === "zoho") {
  const { ZohoProvider } = await import("./providers/zoho");
  _provider = new ZohoProvider();
}
```

### File Structure

```typescript
// lib/providers/zoho.ts

import type { DataService } from "../data";
import type {
  Person, PersonWithComputed, Organization, FundingEntity,
  Activity, FundedInvestment, User, PeopleFilters,
  ActivityFilters, RecentActivityFilters, DashboardStats,
  RelatedContactLink, ReferrerLink,
} from "../types";
import { computeDaysSinceLastTouch, computeIsStale, computeIsOverdue } from "../stale";
import { getTodayCT } from "../format";

const API_BASE = process.env.ZOHO_API_BASE || "https://www.zohoapis.com/crm/v6";
const ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  // See Section 7: Token Refresh
}

async function zohoFetch(path: string, options?: RequestInit): Promise<any> {
  // See Section 7: Token Refresh
}

export class ZohoProvider implements DataService {
  // Method implementations below
}
```

---

## 3. Zoho Module & Field Mapping

### Module Mapping

| Our Entity | Zoho Module | Zoho API Name | Notes |
|---|---|---|---|
| Person | Contacts | `Contacts` | Use standard Contacts module. Custom fields for prospect-specific data. |
| Organization | Accounts | `Accounts` | Use standard Accounts module. |
| Funding Entity | Funding_Entities | `Funding_Entities` | Custom module — must be created in Zoho. |
| Activity | Activities + Notes | `Activities` | Custom module `Activity_Logs` recommended (see below). |
| Funded Investment | Funded_Investments | `Funded_Investments` | Custom module — must be created in Zoho. |
| Referrer Link | Referrer_Links | `Referrer_Links` | Junction custom module for many-to-many. |
| Related Contact Link | Related_Contact_Links | `Related_Contact_Links` | Junction custom module with role field. |
| User | Users | `users` | Standard Zoho users (read-only from our side). |

> **Activity Log:** Zoho's standard Activities module covers Tasks/Events/Calls but is awkward for our unified activity log. **Recommended:** Create a custom module `Activity_Logs` that stores all activity types uniformly. If you prefer to use standard modules, see the mapping notes in the Activity section below.

### Person (Contact) Field Mapping

| Our Field | Zoho Field API Name | Zoho Type | Notes |
|---|---|---|---|
| `id` | `id` | Auto | Zoho record ID |
| `fullName` | `Full_Name` | Text | Or construct from `First_Name` + `Last_Name` |
| `createdDate` | `Created_Time` | DateTime | Zoho auto-sets; extract date portion |
| `email` | `Email` | Email | Standard field |
| `phone` | `Phone` | Phone | Standard field |
| `organizationId` | `Account_Name` | Lookup(Accounts) | Standard Contacts→Accounts lookup |
| `roles` | `Roles` | Multi-select | Custom field. Values: `Prospect`, `Referrer`, `Related_Contact`, `Funded_Investor` |
| `pipelineStage` | `Pipeline_Stage` | Picklist | Custom field. 11 values (see Section 3 of DESIGN-SPEC) |
| `stageChangedDate` | `Stage_Changed_Date` | Date | Custom field. Written by frontend on stage change. |
| `initialInvestmentTarget` | `Initial_Investment_Target` | Currency | Custom field |
| `growthTarget` | `Growth_Target` | Currency | Custom field |
| `committedAmount` | `Committed_Amount` | Currency | Custom field. Verbal target, not funded rollup. |
| `commitmentDate` | `Commitment_Date` | Date | Custom field. Written by frontend when Committed Amount changes. |
| `nextActionType` | `Next_Action_Type` | Picklist | Custom field. 7 values. |
| `nextActionDetail` | `Next_Action_Detail` | Text(250) | Custom field |
| `nextActionDate` | `Next_Action_Date` | Date | Custom field |
| `leadSource` | `Lead_Source` | Picklist | Standard field, customize values |
| `assignedRepId` | `Owner` | Lookup(Users) | Standard record owner |
| `collaboratorIds` | `Collaborators` | Multi-select (User) | Custom field. Store as comma-separated user IDs or multi-user lookup. |
| `notes` | `Description` | Long Text | Standard field |
| `lostReason` | `Lost_Reason` | Picklist | Custom field. 6 values. |
| `reengageDate` | `Reengage_Date` | Date | Custom field |
| `contactType` | `Contact_Type` | Picklist | Custom field. 6 values. |
| `contactCompany` | `Contact_Company` | Text | Custom field |

### Organization (Account) Field Mapping

| Our Field | Zoho Field API Name | Zoho Type | Notes |
|---|---|---|---|
| `id` | `id` | Auto | |
| `name` | `Account_Name` | Text | Standard field |
| `type` | `Account_Type` | Picklist | Standard field, customize values: Family Office, Wealth Management, Corporate, Individual/None |
| `notes` | `Description` | Long Text | Standard field |

### Funding Entity Field Mapping

| Our Field | Zoho Field API Name | Zoho Type | Notes |
|---|---|---|---|
| `id` | `id` | Auto | |
| `entityName` | `Name` | Text | Module name field |
| `entityType` | `Entity_Type` | Picklist | 6 values |
| `personId` | `Contact_Name` | Lookup(Contacts) | Links to Person |
| `status` | `Status` | Picklist | Active, Pending Setup, Inactive |
| `einTaxId` | `EIN_Tax_ID` | Text | |
| `notes` | `Description` | Long Text | |

### Activity Log Field Mapping

| Our Field | Zoho Field API Name | Zoho Type | Notes |
|---|---|---|---|
| `id` | `id` | Auto | |
| `personId` | `Contact_Name` | Lookup(Contacts) | Links to Person |
| `activityType` | `Activity_Type` | Picklist | 11 values |
| `source` | `Source` | Picklist | Manual, Zoho Telephony, O365 Sync |
| `date` | `Activity_Date` | Date | |
| `time` | `Activity_Time` | Text | Store as "HH:MM" string |
| `outcome` | `Outcome` | Picklist | Connected, Attempted |
| `detail` | `Detail` | Long Text | |
| `documentsAttached` | `Documents_Attached` | Text | JSON array of `{ name, url }` objects. Use Zoho Attachments API to get download URLs. See note below. |
| `loggedById` | `Logged_By` | Lookup(Users) | Or use Owner field |
| `annotation` | `Annotation` | Long Text | For notes on auto-synced entries |

> **Document Attachment URLs:** The frontend activity timeline displays document names as clickable links. To support this, `documentsAttached` must be an array of `{ name: string, url: string }` objects — not just file names. Fetch attachment metadata from the Zoho Attachments API:
> ```bash
> GET {API_BASE}/Activity_Logs/{RECORD_ID}/Attachments
> ```
> Response includes `file_Name` and a download URL. Map these to `{ name, url }` when building the activity response. The frontend renders `name` as the link label and opens `url` on click.

### Funded Investment Field Mapping

| Our Field | Zoho Field API Name | Zoho Type | Notes |
|---|---|---|---|
| `id` | `id` | Auto | |
| `fundingEntityId` | `Funding_Entity` | Lookup(Funding_Entities) | |
| `personId` | `Contact_Name` | Lookup(Contacts) | Denormalized for querying |
| `amountInvested` | `Amount_Invested` | Currency | |
| `investmentDate` | `Investment_Date` | Date | |
| `track` | `Track` | Picklist | Maintain, Grow |
| `growthTarget` | `Growth_Target` | Currency | |
| `nextCheckInDate` | `Next_Check_In_Date` | Date | |
| `notes` | `Description` | Long Text | |

### Referrer Link (Junction Module) Field Mapping

| Our Field | Zoho Field API Name | Zoho Type | Notes |
|---|---|---|---|
| `prospectId` | `Prospect` | Lookup(Contacts) | |
| `referrerId` | `Referrer` | Lookup(Contacts) | |

### Related Contact Link (Junction Module) Field Mapping

| Our Field | Zoho Field API Name | Zoho Type | Notes |
|---|---|---|---|
| `prospectId` | `Prospect` | Lookup(Contacts) | |
| `contactId` | `Related_Contact` | Lookup(Contacts) | |
| `role` | `Role` | Text | "CPA -- managing entity structure" |

---

## 4. Method-by-Method Implementation

### 4.1 People

#### `getPeople(filters?: PeopleFilters): Promise<PersonWithComputed[]>`

**Endpoint:** `GET {API_BASE}/Contacts`
**With filters:** Use COQL for complex queries.

**Simple (no filters):**
```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Contacts?fields=Full_Name,Email,Phone,Account_Name,Roles,Pipeline_Stage,Stage_Changed_Date,Initial_Investment_Target,Growth_Target,Committed_Amount,Commitment_Date,Next_Action_Type,Next_Action_Detail,Next_Action_Date,Lead_Source,Owner,Collaborators,Description,Lost_Reason,Reengage_Date,Contact_Type,Contact_Company,Created_Time&per_page=200&page=1" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

**With filters (COQL):**
```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Full_Name, Email, Phone, Account_Name, Roles, Pipeline_Stage, Stage_Changed_Date, Initial_Investment_Target, Growth_Target, Committed_Amount, Commitment_Date, Next_Action_Type, Next_Action_Detail, Next_Action_Date, Lead_Source, Owner, Collaborators, Description, Lost_Reason, Reengage_Date, Contact_Type, Contact_Company, Created_Time FROM Contacts WHERE Pipeline_Stage = '\''Active Engagement'\'' AND Owner = '\''USER_ID'\'' LIMIT 200"
  }'
```

**Response mapping:**
```typescript
function mapZohoContactToPerson(record: any): Person {
  return {
    id: record.id,
    fullName: record.Full_Name,
    createdDate: record.Created_Time?.split("T")[0] || "",
    email: record.Email || null,
    phone: record.Phone || null,
    organizationId: record.Account_Name?.id || null,
    roles: (record.Roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_")),
    pipelineStage: toSnakeCase(record.Pipeline_Stage) || null,
    stageChangedDate: record.Stage_Changed_Date || null,
    initialInvestmentTarget: record.Initial_Investment_Target || null,
    growthTarget: record.Growth_Target || null,
    committedAmount: record.Committed_Amount || null,
    commitmentDate: record.Commitment_Date || null,
    nextActionType: toSnakeCase(record.Next_Action_Type) || null,
    nextActionDetail: record.Next_Action_Detail || null,
    nextActionDate: record.Next_Action_Date || null,
    leadSource: toSnakeCase(record.Lead_Source) || null,
    assignedRepId: record.Owner?.id || null,
    collaboratorIds: parseMultiSelect(record.Collaborators),
    notes: record.Description || null,
    lostReason: toSnakeCase(record.Lost_Reason) || null,
    reengageDate: record.Reengage_Date || null,
    contactType: toSnakeCase(record.Contact_Type) || null,
    contactCompany: record.Contact_Company || null,
  };
}

// Helper: convert "Active Engagement" -> "active_engagement"
function toSnakeCase(val: string | null): string | null {
  if (!val) return null;
  return val.toLowerCase().replace(/[\s\/]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function parseMultiSelect(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v: any) => v.id || v);
  return [];
}
```

**Enriching to `PersonWithComputed`:** After mapping to `Person`, fetch that person's activities and compute `daysSinceLastTouch`, `isStale`, `isOverdue`, `activityCount`, `organizationName`, `assignedRepName`, `referrerName` — same logic as `MockProvider.enrichPerson()`.

> **Performance tip:** For list views, batch-fetch activities for all visible people in one COQL query rather than N+1 queries.

---

#### `getPerson(id: string): Promise<PersonWithComputed | null>`

**Endpoint:** `GET {API_BASE}/Contacts/{id}`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Contacts/RECORD_ID" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

Map using `mapZohoContactToPerson()`, then enrich to `PersonWithComputed`.

---

#### `createPerson(data: Partial<Person>): Promise<Person>`

> **Frontend API route:** `POST /api/persons` → calls `ds.createPerson()`. The frontend Create Prospect form (slide-out sheet on Dashboard) sends to this route. After creation, the UI redirects to `/person/[id]`. All field defaults (stage = "Prospect", nextActionType = "follow_up", nextActionDate = tomorrow) are applied by the API route before calling `createPerson()`.

**Endpoint:** `POST {API_BASE}/Contacts`

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Contacts" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Last_Name": "Calloway",
      "First_Name": "Robert",
      "Email": "robert@calloway.com",
      "Phone": "214-555-0101",
      "Account_Name": {"id": "ACCOUNT_ID"},
      "Roles": ["Prospect"],
      "Pipeline_Stage": "Active Engagement",
      "Next_Action_Type": "Follow Up",
      "Next_Action_Detail": "Send Q3 deck",
      "Next_Action_Date": "2026-03-20",
      "Lead_Source": "Velocis Network",
      "Owner": {"id": "USER_ID"}
    }]
  }'
```

**Field mapping (our -> Zoho):**
```typescript
function mapPersonToZohoContact(data: Partial<Person>): any {
  const record: any = {};
  if (data.fullName) {
    // Zoho Contacts requires Last_Name. Split fullName.
    const parts = data.fullName.split(" ");
    record.Last_Name = parts.pop();
    record.First_Name = parts.join(" ");
  }
  if (data.email) record.Email = data.email;
  if (data.phone) record.Phone = data.phone;
  if (data.organizationId) record.Account_Name = { id: data.organizationId };
  if (data.roles) record.Roles = data.roles.map(toTitleCase);
  if (data.pipelineStage) record.Pipeline_Stage = toTitleCase(data.pipelineStage);
  if (data.stageChangedDate) record.Stage_Changed_Date = data.stageChangedDate;
  if (data.initialInvestmentTarget != null) record.Initial_Investment_Target = data.initialInvestmentTarget;
  if (data.growthTarget != null) record.Growth_Target = data.growthTarget;
  if (data.committedAmount != null) record.Committed_Amount = data.committedAmount;
  if (data.commitmentDate) record.Commitment_Date = data.commitmentDate;
  if (data.nextActionType) record.Next_Action_Type = toTitleCase(data.nextActionType);
  if (data.nextActionDetail) record.Next_Action_Detail = data.nextActionDetail;
  if (data.nextActionDate) record.Next_Action_Date = data.nextActionDate;
  if (data.leadSource) record.Lead_Source = toTitleCase(data.leadSource);
  if (data.assignedRepId) record.Owner = { id: data.assignedRepId };
  if (data.notes) record.Description = data.notes;
  if (data.lostReason) record.Lost_Reason = toTitleCase(data.lostReason);
  if (data.reengageDate) record.Reengage_Date = data.reengageDate;
  if (data.contactType) record.Contact_Type = toTitleCase(data.contactType);
  if (data.contactCompany) record.Contact_Company = data.contactCompany;
  return record;
}

// Helper: convert "active_engagement" -> "Active Engagement"
function toTitleCase(val: string): string {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
```

**Response:** `response.data[0]` contains the created record with its `id`. Map back to `Person`.

---

#### `updatePerson(id: string, data: Partial<Person>): Promise<Person>`

**Endpoint:** `PUT {API_BASE}/Contacts/{id}`

```bash
curl -X PUT "https://www.zohoapis.com/crm/v6/Contacts/RECORD_ID" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Pipeline_Stage": "Soft Commit",
      "Committed_Amount": 250000,
      "Commitment_Date": "2026-03-17",
      "Stage_Changed_Date": "2026-03-17"
    }]
  }'
```

Use `mapPersonToZohoContact()` for the body. Only send changed fields.

---

#### `searchPeople(query: string): Promise<PersonWithComputed[]>`

**Endpoint:** `GET {API_BASE}/Contacts/search?word={query}`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Contacts/search?word=calloway&per_page=10" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

Zoho searches across name, email, and phone. Map results through `mapZohoContactToPerson()` and enrich.

---

### 4.2 Referrer Relationships

#### `addReferrer(prospectId: string, referrerId: string): Promise<void>`

**Endpoint:** `POST {API_BASE}/Referrer_Links`

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Referrer_Links" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Prospect": {"id": "PROSPECT_ID"},
      "Referrer": {"id": "REFERRER_ID"}
    }]
  }'
```

---

#### `getReferrals(referrerId: string): Promise<PersonWithComputed[]>`

**Endpoint:** COQL query on `Referrer_Links` then fetch linked Contacts.

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Prospect FROM Referrer_Links WHERE Referrer = '\''REFERRER_ID'\''"
  }'
```

Extract prospect IDs, then batch-fetch Contacts.

---

#### `getReferrerForProspect(prospectId: string): Promise<Person | null>`

**Endpoint:** COQL query on `Referrer_Links` filtered by prospect.

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Referrer FROM Referrer_Links WHERE Prospect = '\''PROSPECT_ID'\'' LIMIT 1"
  }'
```

If result found, fetch the Referrer Contact record.

---

### 4.3 Related Contact Relationships

#### `addRelatedContact(prospectId: string, contactId: string, role: string): Promise<void>`

**Endpoint:** `POST {API_BASE}/Related_Contact_Links`

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Related_Contact_Links" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Prospect": {"id": "PROSPECT_ID"},
      "Related_Contact": {"id": "CONTACT_ID"},
      "Role": "CPA -- managing entity structure"
    }]
  }'
```

---

#### `getRelatedContacts(prospectId: string): Promise<(RelatedContactLink & { contact: Person })[]>`

**Endpoint:** COQL query on `Related_Contact_Links`.

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Related_Contact, Role FROM Related_Contact_Links WHERE Prospect = '\''PROSPECT_ID'\''"
  }'
```

For each result, fetch the Contact record and return as `RelatedContactLink & { contact: Person }`.

---

### 4.4 Organizations

#### `getOrganizations(): Promise<Organization[]>`

**Endpoint:** `GET {API_BASE}/Accounts`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Accounts?fields=Account_Name,Account_Type,Description&per_page=200" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

**Mapping:**
```typescript
function mapZohoAccountToOrg(record: any): Organization {
  return {
    id: record.id,
    name: record.Account_Name,
    type: toSnakeCase(record.Account_Type) as OrgType | null,
    notes: record.Description || null,
  };
}
```

---

#### `getOrganization(id: string): Promise<Organization | null>`

**Endpoint:** `GET {API_BASE}/Accounts/{id}`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Accounts/RECORD_ID" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

---

#### `createOrganization(data: Partial<Organization>): Promise<Organization>`

**Endpoint:** `POST {API_BASE}/Accounts`

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Accounts" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Account_Name": "Calloway Family Office",
      "Account_Type": "Family Office",
      "Description": "Multi-gen wealth management"
    }]
  }'
```

---

#### `searchOrganizations(query: string): Promise<Organization[]>`

**Endpoint:** `GET {API_BASE}/Accounts/search?word={query}`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Accounts/search?word=calloway&per_page=10" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

---

### 4.5 Funding Entities

#### `getFundingEntities(personId: string): Promise<FundingEntity[]>`

**Endpoint:** COQL query on `Funding_Entities` filtered by Contact.

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Name, Entity_Type, Contact_Name, Status, EIN_Tax_ID, Description FROM Funding_Entities WHERE Contact_Name = '\''PERSON_ID'\''"
  }'
```

**Mapping:**
```typescript
function mapZohoToFundingEntity(record: any): FundingEntity {
  return {
    id: record.id,
    entityName: record.Name,
    entityType: toSnakeCase(record.Entity_Type) as EntityType,
    personId: record.Contact_Name?.id || "",
    status: toSnakeCase(record.Status) as EntityStatus,
    einTaxId: record.EIN_Tax_ID || null,
    notes: record.Description || null,
  };
}
```

---

#### `createFundingEntity(data: Partial<FundingEntity>): Promise<FundingEntity>`

**Endpoint:** `POST {API_BASE}/Funding_Entities`

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Funding_Entities" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Name": "Calloway Family Trust",
      "Entity_Type": "Trust",
      "Contact_Name": {"id": "CONTACT_ID"},
      "Status": "Active"
    }]
  }'
```

---

### 4.6 Activities

#### `getActivities(personId: string, filters?: ActivityFilters): Promise<Activity[]>`

**Endpoint:** COQL query on `Activity_Logs` filtered by Contact.

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Activity_Type, Source, Activity_Date, Activity_Time, Outcome, Detail, Documents_Attached, Logged_By, Annotation FROM Activity_Logs WHERE Contact_Name = '\''PERSON_ID'\'' ORDER BY Activity_Date DESC, Activity_Time DESC LIMIT 200"
  }'
```

**With date/type filters, add WHERE clauses:**
```sql
... WHERE Contact_Name = 'PERSON_ID'
  AND Activity_Type IN ('Call', 'Email')
  AND Activity_Date >= '2026-01-01'
  AND Activity_Date <= '2026-03-17'
ORDER BY Activity_Date DESC
```

**Mapping:**
```typescript
function mapZohoToActivity(record: any): Activity {
  return {
    id: record.id,
    personId: record.Contact_Name?.id || "",
    activityType: toSnakeCase(record.Activity_Type) as ActivityType,
    source: toSnakeCase(record.Source) as ActivitySource,
    date: record.Activity_Date || "",
    time: record.Activity_Time || null,
    outcome: toSnakeCase(record.Outcome) as ActivityOutcome,
    detail: record.Detail || "",
    documentsAttached: record.Documents_Attached ? JSON.parse(record.Documents_Attached) : [],
    loggedById: record.Logged_By?.id || record.Owner?.id || "",
    annotation: record.Annotation || null,
  };
}
```

---

#### `getRecentActivities(filters?: RecentActivityFilters): Promise<(Activity & { personName: string })[]>`

**Endpoint:** COQL query across all Activity_Logs, joining Contact name.

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Activity_Type, Source, Activity_Date, Activity_Time, Outcome, Detail, Contact_Name, Logged_By FROM Activity_Logs WHERE Activity_Date >= '\''2026-03-10'\'' ORDER BY Activity_Date DESC, Activity_Time DESC LIMIT 50"
  }'
```

Add `AND Logged_By = 'USER_ID'` if `filters.repId` is set.

For `personName`: the COQL response includes the lookup field `Contact_Name` which contains `{ id, name }`. Use `record.Contact_Name.name` for `personName`.

---

#### `createActivity(personId: string, data: Partial<Activity>): Promise<Activity>`

> **Time handling:** The Quick Log form does not expose a time input. Time is auto-captured server-side at the moment of submission (current CT time). The Zoho provider should set `Activity_Time` to the current time when `data.time` is not provided by the client.

**Endpoint:** `POST {API_BASE}/Activity_Logs`

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Activity_Logs" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Contact_Name": {"id": "PERSON_ID"},
      "Activity_Type": "Call",
      "Source": "Manual",
      "Activity_Date": "2026-03-17",
      "Activity_Time": "14:30",
      "Outcome": "Connected",
      "Detail": "Discussed Q3 returns, very interested in increasing allocation",
      "Logged_By": {"id": "USER_ID"}
    }]
  }'
```

---

### 4.7 Funded Investments

#### `getFundedInvestments(): Promise<FundedInvestment[]>`

**Endpoint:** `GET {API_BASE}/Funded_Investments`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Funded_Investments?fields=Funding_Entity,Contact_Name,Amount_Invested,Investment_Date,Track,Growth_Target,Next_Check_In_Date,Description&per_page=200" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

**Mapping:**
```typescript
function mapZohoToFundedInvestment(record: any): FundedInvestment {
  return {
    id: record.id,
    fundingEntityId: record.Funding_Entity?.id || "",
    personId: record.Contact_Name?.id || "",
    amountInvested: record.Amount_Invested || 0,
    investmentDate: record.Investment_Date || "",
    track: toSnakeCase(record.Track) as InvestmentTrack,
    growthTarget: record.Growth_Target || null,
    nextCheckInDate: record.Next_Check_In_Date || "",
    notes: record.Description || null,
  };
}
```

---

#### `createFundedInvestment(data: Omit<FundedInvestment, "id">): Promise<FundedInvestment>`

**Design note:** The funded transition flow always creates a new Funding Entity first, then creates the Funded Investment linked to it. There is no "select existing entity" path in the UI — every funding event produces a new entity record. Call `createFundingEntity()` first to get the entity ID, then call this method.

**Endpoint:** `POST {API_BASE}/Funded_Investments`

```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Funded_Investments" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Funding_Entity": {"id": "ENTITY_ID"},
      "Contact_Name": {"id": "CONTACT_ID"},
      "Amount_Invested": 500000,
      "Investment_Date": "2026-03-17",
      "Track": "Maintain",
      "Growth_Target": null,
      "Next_Check_In_Date": "2026-06-17"
    }]
  }'
```

**If Track = Grow**, include `"Growth_Target": <number>` in the payload.

**Next_Check_In_Date** is always set to +90 days from `Investment_Date` by the frontend — no manual input required.

---

### 4.8 Dashboard

#### `getDashboardStats(): Promise<DashboardStats>`

This is an aggregation method. Use COQL to compute each stat:

**Active Pipeline Count + Pipeline Value:**
```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT COUNT(id) as count, SUM(Initial_Investment_Target) as total FROM Contacts WHERE Pipeline_Stage NOT IN ('\''Funded'\'', '\''Nurture'\'', '\''Dead / Lost'\'') AND Roles LIKE '\''%Prospect%'\''"
  }'
```

> **Note:** COQL may not support aggregate functions on all Zoho editions. If not, fetch all records and aggregate in code. Use `per_page=200` with pagination.

**Committed Value:**
```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT SUM(Committed_Amount) as total FROM Contacts WHERE Pipeline_Stage IN ('\''Soft Commit'\'', '\''Commitment Processing'\'', '\''KYC / Docs'\'')"
  }'
```

**Funded YTD:**
```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT SUM(Amount_Invested) as total FROM Funded_Investments WHERE Investment_Date >= '\''2026-01-01'\''"
  }'
```

**Implementation:**
```typescript
async getDashboardStats(): Promise<DashboardStats> {
  // If COQL aggregates aren't supported, fall back to:
  const people = await this.getPeople({ roles: ["prospect"] });
  const activeStages = ["prospect","initial_contact","discovery","pitch",
    "active_engagement","soft_commit","commitment_processing","kyc_docs"];
  const committedStages = ["soft_commit","commitment_processing","kyc_docs"];

  const activePeople = people.filter(p => p.pipelineStage && activeStages.includes(p.pipelineStage));
  const committedPeople = people.filter(p => p.pipelineStage && committedStages.includes(p.pipelineStage));

  const investments = await this.getFundedInvestments();
  const currentYear = new Date().getFullYear();
  const ytdInvestments = investments.filter(i => i.investmentDate.startsWith(String(currentYear)));

  return {
    activePipelineCount: activePeople.length,
    pipelineValue: activePeople.reduce((sum, p) => sum + (p.initialInvestmentTarget || 0), 0),
    committedValue: committedPeople.reduce((sum, p) => sum + (p.committedAmount || 0), 0),
    fundedYTD: ytdInvestments.reduce((sum, i) => sum + i.amountInvested, 0),
  };
}
```

---

### 4.9 Users

#### `getUsers(): Promise<User[]>`

**Endpoint:** `GET {API_BASE}/users?type=ActiveUsers`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/users?type=ActiveUsers" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

**Mapping:**
```typescript
function mapZohoToUser(record: any): User {
  return {
    id: record.id,
    username: record.email?.split("@")[0] || record.id,
    fullName: record.full_name,
    role: mapZohoProfile(record.profile?.name), // Map Zoho profile to our role
    isActive: record.status === "active",
  };
}

function mapZohoProfile(profileName: string): UserRole {
  // Map Zoho CRM profiles to our roles
  if (profileName === "Administrator") return "admin";
  if (profileName === "Marketing") return "marketing";
  return "rep";
}
```

---

#### `getUserByUsername(username: string): Promise<(User & { passwordHash: string }) | null>`

**Note:** This method is used for V1 password-based auth. When using the Zoho provider, authentication should migrate to Zoho OAuth (see DESIGN-SPEC Section 8.2). For the initial cutover, you can:

1. Keep the V1 password auth as-is (env-var user store) and only switch the data provider to Zoho, OR
2. Implement Zoho OAuth login where `getUserByUsername` is no longer needed.

For option 1, this method can delegate to the same env-var user store used by the mock provider. The Zoho provider only handles data, not auth.

---

### 4.x New Methods — Added 2026-03-18

These methods were added to the DataService interface to support the inline editing UX and chip-based lead source picker. All Zoho provider implementations must include them.

#### `GET /api/lead-sources` — Lead Source List + Frequency

**API route:** `app/api/lead-sources/route.ts`

Returns the full `LEAD_SOURCES` array (from `lib/constants.ts`) sorted by frequency of use, plus the raw counts map. Used by `LeadSourcePicker` to order chips.

Response shape:
```json
{
  "sources": [{ "key": "cpa_referral", "label": "CPA Referral", "category": "Referral" }, ...],
  "counts": { "cpa_referral": 5, "linkedin": 3, ... }
}
```

Calls `ds.getLeadSourceCounts()` internally. The Zoho provider must implement this method.

---

#### `getLeadSourceCounts(): Promise<Record<string, number>>`

Returns a count of how many people have each lead source value. Used by the `GET /api/lead-sources` route to sort the chip display. Also used when adding a new lead source so the chip immediately appears in the correct frequency position.

**Endpoint:** COQL query
```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Lead_Source, count(id) FROM Contacts WHERE Lead_Source IS NOT NULL GROUP BY Lead_Source"
  }'
```

**Response mapping:**
```typescript
async getLeadSourceCounts(): Promise<Record<string, number>> {
  const result = await zohoFetch("/coql", {
    method: "POST",
    body: JSON.stringify({
      select_query: "SELECT Lead_Source, count(id) FROM Contacts WHERE Lead_Source IS NOT NULL GROUP BY Lead_Source"
    })
  });
  const freq: Record<string, number> = {};
  for (const row of result.data || []) {
    const key = toSnakeCase(row.Lead_Source);
    freq[key] = row["count(id)"] || 0;
  }
  return freq;
}
```

---

#### Organization Link/Unlink (inline editing)

The frontend now supports inline organization editing on Person Detail. These operations need the existing `updatePerson` PATCH with `organizationId`.

**Link org to person:**
```bash
curl -X PUT "https://www.zohoapis.com/crm/v6/Contacts/PERSON_ID" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "data": [{ "Account_Name": { "id": "ORG_ID" } }] }'
```

**Remove org from person** (set to null):
```bash
curl -X PUT "https://www.zohoapis.com/crm/v6/Contacts/PERSON_ID" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "data": [{ "Account_Name": null }] }'
```

---

#### Referrer Link/Unlink (inline editing)

Referrer relationships are stored in the `Referrer_Links` junction module.

**API routes used:**
- `POST /api/persons/[id]/referrer` → calls `addReferrer(prospectId, referrerId)`
- `DELETE /api/persons/[id]/referrer` → calls `removeReferrer(prospectId, referrerId)`

**Zoho implementation:**
```typescript
async addReferrer(prospectId: string, referrerId: string): Promise<void> {
  await zohoFetch("/Referrer_Links", {
    method: "POST",
    body: JSON.stringify({
      data: [{
        Prospect: { id: prospectId },
        Referrer: { id: referrerId },
      }]
    })
  });
}

async removeReferrer(prospectId: string, referrerId: string): Promise<void> {
  // Find the junction record first
  const result = await zohoFetch(
    `/coql`,
    { method: "POST", body: JSON.stringify({
      select_query: `SELECT id FROM Referrer_Links WHERE Prospect.id = '${prospectId}' AND Referrer.id = '${referrerId}' LIMIT 1`
    })}
  );
  const linkId = result.data?.[0]?.id;
  if (linkId) await zohoFetch(`/Referrer_Links/${linkId}`, { method: "DELETE" });
}
```

---

#### Funding Entity — Create/Delete (inline editing)

The frontend now supports creating and removing funding entities inline on Person Detail.

**Create:**
```bash
curl -X POST "https://www.zohoapis.com/crm/v6/Funding_Entities" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "Name": "Calloway Family Trust",
      "Entity_Type": "Trust",
      "Contact_Name": { "id": "PERSON_ID" },
      "Status": "Active"
    }]
  }'
```

**Delete:**
```bash
curl -X DELETE "https://www.zohoapis.com/crm/v6/Funding_Entities/ENTITY_ID" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

**Important:** Funding entities are 1:1 per person — each entity has a `Contact_Name` lookup. Two prospects can have entities with the same `Name` — they are separate Zoho records with different `id` values. Do not try to share entities between contacts.

---

#### "Prospect Added" Activity Type

When `createPerson()` is called, the frontend automatically creates a "Prospect Added" system activity. The Zoho provider must:

1. Ensure `Prospect Added` exists as a valid picklist value in `Activity_Type` on the `Activity_Logs` module (system-only value — never shown in the UI as a manual option)
2. Write the activity with:
   ```typescript
   {
     Activity_Type: "Prospect Added",
     Detail: "Prospect added to pipeline",
     Activity_Date: todayDate,  // CT date
     Source: "Manual",
     Outcome: "Connected",      // Default, not relevant for this type
     Contact_Name: { id: personId },
     Logged_By: { id: currentUserId },
   }
   ```
3. The Zoho implementation of `createPerson()` should call `createActivity()` as its last step before returning.

---

#### Lead Source → Zoho Picklist Value Mapping

The chip picker stores and reads lead source values using the keys defined in `lib/constants.ts`. These must map **exactly** to the Zoho `Lead_Source` picklist values.

| Frontend key (`lib/constants.ts`) | Zoho picklist value |
|---|---|
| `velocis_network` | `Velocis Network` |
| `cpa_referral` | `CPA Referral` |
| `legacy_event` | `Legacy Event` |
| `linkedin` | `LinkedIn` |
| `ken_dbj_list` | `Ken - DBJ List` |
| `ken_event_followup` | `Ken - Event Follow-up` |
| `tolleson_wm` | `Tolleson WM` |
| `ma_attorney` | `M&A Attorney` |
| `cold_outreach` | `Cold Outreach` |
| `other` | `Other` |

> ⚠️ If any Zoho picklist value changes name, the frontend `LEAD_SOURCES` constant in `lib/constants.ts` must be updated to match. These values are the single source of truth — any mismatch will cause the chip to not select/display correctly.

---

---

### 4.y New Methods — Added 2026-03-18 (Person Detail Completion)

These methods were added to the DataService interface during the Person Detail Completion session. All Zoho provider implementations must include them.

---

#### `removeRelatedContact(prospectId: string, contactId: string): Promise<void>`

Removes a related contact link from a prospect.

**API route:** `DELETE /api/persons/[id]/related-contacts/[contactId]`

**Zoho implementation:**
```typescript
async removeRelatedContact(prospectId: string, contactId: string): Promise<void> {
  // Find the Related_Contact_Links junction record
  const result = await zohoFetch("/coql", {
    method: "POST",
    body: JSON.stringify({
      select_query: `SELECT id FROM Related_Contact_Links WHERE Prospect.id = '${prospectId}' AND Related_Contact.id = '${contactId}' LIMIT 1`
    })
  });
  const linkId = result.data?.[0]?.id;
  if (linkId) await zohoFetch(`/Related_Contact_Links/${linkId}`, { method: "DELETE" });
}
```

Also see: `addRelatedContact` — already documented in Section 4 under Related Contacts.

---

#### `createFundedInvestment(data: Omit<FundedInvestment, "id">): Promise<FundedInvestment>`

Creates a Funded Investment record linked to a Funding Entity and Person. Called as part of the Funded transition flow: `POST /api/persons/[id]/funded-investment`.

**API route:** `POST /api/persons/[id]/funded-investment`

**Request body:**
```json
{
  "fundingEntityId": "ENTITY_ID",
  "amountInvested": 250000,
  "investmentDate": "2026-03-18",
  "track": "maintain",
  "growthTarget": null,
  "nextCheckInDate": "2026-06-16"
}
```

**Zoho implementation:**
```typescript
async createFundedInvestment(data: Omit<FundedInvestment, "id">): Promise<FundedInvestment> {
  const result = await zohoFetch("/Funded_Investments", {
    method: "POST",
    body: JSON.stringify({
      data: [{
        Funding_Entity: { id: data.fundingEntityId },
        Contact_Name: { id: data.personId },
        Amount_Invested: data.amountInvested,
        Investment_Date: data.investmentDate,
        Track: data.track === "maintain" ? "Maintain" : "Grow",
        Growth_Target: data.growthTarget ?? null,
        Next_Check_In_Date: data.nextCheckInDate,
        Description: data.notes ?? null,
      }]
    })
  });
  const id = result.data?.[0]?.details?.id;
  return { ...data, id };
}
```

**Note:** `nextCheckInDate` is calculated by the frontend as investment date + 90 days. The Zoho provider should store it as-is.

---

#### Stage Change Validation — Nurture & Dead

`PATCH /api/persons/[id]/stage` now enforces required fields:

| `newStage` | Required field | Error if missing |
|---|---|---|
| `nurture` | `reengageDate` (date string) | 400 `{ error: "reengageDate required for Nurture" }` |
| `dead` | `lostReason` (string, one of `LOST_REASONS` keys) | 400 `{ error: "lostReason required for Dead" }` |

The Zoho provider's `updatePerson` must handle these fields:
- `reengageDate` → `Reengage_Date` (Date field on Contact)
- `lostReason` → `Lost_Reason` (Picklist field on Contact)

Both are already in the field mapping table above (Section 3).

---

#### Reassignment Auto-Log

`PATCH /api/persons/[id]/rep` replaces the direct `updatePerson` call for admin rep changes. It:
1. Looks up old and new rep names from `getUsers()`
2. Calls `updatePerson(id, { assignedRepId: newRepId })`
3. Calls `createActivity(...)` with `activityType: "reassignment"` and detail `"Reassigned from {oldName} to {newName}"`

The Zoho provider's `createActivity` already handles the `reassignment` activity type — no changes needed. Ensure `reassignment` is a valid picklist value in the `Activity_Type` field on the `Activity_Logs` module (system-only, not shown as a manual option in the UI).

---

---

### 4.z New Methods — Added 2026-03-18/19 (Leadership Dashboard + Admin Panel)

These methods were added to the DataService interface during the Leadership/Admin sessions. All Zoho provider implementations must include them.

---

#### `getLeadershipStats(): Promise<LeadershipStats>`

Returns fund-level KPIs for the Leadership Dashboard stat column.

```typescript
interface LeadershipStats {
  aumRaised: number;       // Sum of all FundedInvestment.amountInvested
  fundTarget: number;      // Read from SystemConfig (default $10.5M, admin-configurable)
  fundedYTDCount: number;  // Count of FundedInvestments in current calendar year
  activeCount: number;     // Count of prospects in active pipeline stages
  pipelineValue: number;   // Sum of initialInvestmentTarget for active prospects
}
```

**Zoho implementation:** Use COQL queries (or fallback to full-list aggregation if COQL aggregates aren't supported). Same pattern as `getDashboardStats()` — see Section 4.8 for COQL examples.

---

#### `getMeetingsCount(days: number): Promise<number>`

Returns count of `meeting`-type activities in the past `days` days. Used by the Meetings card with 7d/14d/30d toggle.

**Zoho implementation:**
```typescript
async getMeetingsCount(days: number): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];
  const result = await zohoFetch("/coql", {
    method: "POST",
    body: JSON.stringify({
      select_query: `SELECT COUNT(id) as count FROM Activity_Logs WHERE Activity_Type = 'Meeting' AND Activity_Date >= '${sinceStr}'`
    })
  });
  return result.data?.[0]?.count ?? 0;
}
```

---

#### `getFunnelData(): Promise<FunnelStage[]>`

Returns per-stage counts and dollar totals for the Pipeline Funnel visualization.

```typescript
interface FunnelStage {
  stage: string;       // stage key (e.g., "pitch")
  label: string;       // display label (e.g., "Pitch")
  count: number;       // number of prospects in this stage
  totalValue: number;  // sum of initialInvestmentTarget for prospects in this stage
}
```

**Zoho implementation:** Fetch all active prospects and group by stage in code (simplest), or use COQL GROUP BY:
```sql
SELECT Pipeline_Stage, COUNT(id) as count, SUM(Initial_Investment_Target) as total
FROM Contacts
WHERE Pipeline_Stage NOT IN ('Funded', 'Nurture', 'Dead / Lost')
GROUP BY Pipeline_Stage
```

---

#### `getSourceROI(): Promise<SourceROIRow[]>`

Returns per-source attribution stats for the Source ROI Table.

```typescript
interface SourceROIRow {
  source: string;         // source key (e.g., "cpa_referral")
  label: string;          // display label
  prospectCount: number;  // total prospects with this source
  fundedCount: number;    // how many are Funded
  aum: number;            // sum of amountInvested for funded prospects from this source
  conversionPct: number;  // fundedCount / prospectCount * 100
}
```

**Zoho implementation:** Fetch all people with roles=Prospect. For each lead source group, count prospects and cross-reference with FundedInvestments. Can be done in code after fetching both lists.

---

#### `getDrilldownProspects(filter: DrilldownProspectFilter): Promise<PersonWithComputed[]>`

Returns the filtered prospect list for drill-down sheets in the Leadership Dashboard.

```typescript
interface DrilldownProspectFilter {
  stage?: string;        // filter by pipeline stage
  leadSource?: string;   // filter by lead source key
  fundedYTD?: boolean;   // only FundedInvestments created in current calendar year
  active?: boolean;      // only active pipeline stages
}
```

**Zoho implementation:** Filter from `getPeople()` results — no separate Zoho API call needed.

---

#### `getDrilldownActivities(filter: DrilldownActivityFilter): Promise<RecentActivityEntry[]>`

Returns filtered activities for the Meetings drill-down sheet.

```typescript
interface DrilldownActivityFilter {
  activityType: string;  // e.g., "meeting"
  days: number;          // look back N days
}
```

**Zoho implementation:** Query Activity_Logs module filtered by `Activity_Type` and `Activity_Date >= (today - days)`.

---

#### `updateUser(id: string, data: UpdateUserInput): Promise<User>`

Updates a user's role and/or permission overrides. Called from the Admin Panel Users tab.

```typescript
interface UpdateUserInput {
  role?: UserRole;
  permissions?: Partial<UserPermissions>;
}
```

**V1 note:** In V1 (env-var auth), user roles and permissions are stored in memory in the mock provider. The Zoho provider should store permission overrides in a Zoho custom module (e.g., `User_Permissions`) linked to the Zoho user ID. Role changes in Zoho would map to Zoho CRM profiles.

---

#### `deactivateUser(id: string, reassignToId?: string): Promise<void>`

Deactivates a user. If `reassignToId` is provided, all open prospects owned by this user are reassigned before deactivation.

**Zoho implementation:**
1. If `reassignToId` provided: `updatePerson` for all prospects where `assignedRepId === id` → set to `reassignToId`
2. Deactivate user in Zoho: `PUT /users/{id}` with `status: "inactive"`

---

#### `getLeadSources(): Promise<LeadSource[]>`

Returns the full lead source list with order, active flag, and labels. Used by the Admin Panel Lead Sources tab.

```typescript
interface LeadSource {
  key: string;      // internal key (e.g., "cpa_referral")
  label: string;    // display label (e.g., "CPA Referral")
  category: string; // chip category (Referral, Network, Event, Direct)
  isActive: boolean;
  order: number;    // display order (0-indexed)
}
```

**V1 note:** In V1 (mock provider), lead sources are stored in memory extending `lib/constants.ts`. The Zoho provider should read/write these from a Zoho custom module (e.g., `Lead_Source_Config`) and keep Zoho picklist values in sync when labels or active states change.

---

#### `updateLeadSource(key: string, data: UpdateLeadSourceInput): Promise<LeadSource>`

Updates a lead source's label and/or active state.

```typescript
interface UpdateLeadSourceInput {
  label?: string;
  isActive?: boolean;
}
```

**Zoho note:** If the label changes, the Zoho `Lead_Source` picklist value must be updated as well — or map internally from key to label so the Zoho picklist value stays stable while the frontend label can change freely.

---

#### `reorderLeadSources(keys: string[]): Promise<void>`

Persists a new display order for lead sources. `keys` is the full ordered array of all lead source keys.

**V1:** Updates the in-memory order in the mock provider. **Zoho:** Writes order values to the `Lead_Source_Config` module records.

---

#### `getTopReferrers(limit?: number): Promise<ReferrerStats[]>`

Returns the top referrers by referral count, with pipeline and funded value totals.

```typescript
interface ReferrerStats {
  referrerId: string;
  referrerName: string;
  referralCount: number;
  pipelineValue: number;   // sum of initialInvestmentTarget for referred active prospects
  fundedValue: number;     // sum of amountInvested for funded investments from referred prospects
}
```

**Zoho implementation:** Query the Referrer_Links junction module, join with People and FundedInvestments modules to compute aggregates. Group by referrerId, sort by referralCount descending, limit results.

---

#### `getRedFlags(): Promise<PersonWithComputed[]>`

Returns all active-stage prospects that are stale or overdue, sorted by days idle descending. Used by the Leadership Dashboard Red Flags panel.

**Zoho implementation:** Reuse `getPeople()` with active stage filter, then apply stale/overdue computation (same as Pipeline View). Filter to only stale/overdue, sort by daysSinceLastTouch descending.

---

#### `getSystemConfig(): Promise<SystemConfig>`

Returns system-wide configuration settings.

```typescript
interface SystemConfig {
  fundTarget: number;       // e.g., 10_500_000 ($10.5M)
  companyName: string;      // e.g., "OwnEZ Capital"
  defaultRepId: string | null;
}
```

**Zoho implementation:** Store as a single record in a `System_Config` custom module (key-value pairs), or as a JSON blob in a Zoho custom field. Read on every leadership page load.

**API route:** `GET /api/admin/system-config`

---

#### `updateSystemConfig(data: Partial<SystemConfig>): Promise<SystemConfig>`

Updates one or more system config fields. Admin-only.

**Zoho implementation:** `PUT` to the System_Config record in Zoho.

**API route:** `PATCH /api/admin/system-config`

---

#### `getPipelineStageConfigs(): Promise<PipelineStageConfig[]>`

Returns all pipeline stage configurations (label, idle threshold, order).

```typescript
interface PipelineStageConfig {
  key: string;              // e.g., "pitch"
  label: string;            // e.g., "Pitch"
  idleThreshold: number | null;  // days before stale flag, null = no threshold
  order: number;
}
```

**Zoho implementation:** Store in a `Pipeline_Stage_Config` custom module. If not using a custom module, read from the Zoho picklist metadata API and store thresholds in a separate config module.

**API route:** `GET /api/admin/pipeline-stages`

---

#### `updatePipelineStageConfig(key: string, data: { label?, idleThreshold? }): Promise<PipelineStageConfig>`

Updates a stage's label and/or idle threshold. Admin-only.

**Zoho implementation:** Update the corresponding record in `Pipeline_Stage_Config`. If the label changes, also update the Zoho picklist value for Pipeline_Stage.

**API route:** `PATCH /api/admin/pipeline-stages`

---

#### `getActivityTypeConfigs(): Promise<ActivityTypeConfig[]>`

Returns all activity type configurations.

```typescript
interface ActivityTypeConfig {
  key: string;           // e.g., "call"
  label: string;         // e.g., "Call"
  isActive: boolean;     // inactive types hidden from Quick Log picker
  isSystem: boolean;     // stage_change, reassignment — not editable
}
```

**Zoho implementation:** Store in an `Activity_Type_Config` custom module. System types (stage_change, reassignment) should be flagged as non-editable.

**API route:** `GET /api/admin/activity-types`

---

#### `updateActivityTypeConfig(key: string, data: { label?, isActive? }): Promise<ActivityTypeConfig>`

Updates an activity type's label or active state. System types cannot be modified.

**API route:** `PATCH /api/admin/activity-types`

---

#### `createActivityType(data: { label: string }): Promise<ActivityTypeConfig>`

Creates a new custom activity type. Key is auto-generated from the label.

**Zoho implementation:** Create a record in `Activity_Type_Config` and add the value to the Activity_Type picklist in Zoho.

**API route:** `POST /api/admin/activity-types`

---

#### `getUnassignedProspects(): Promise<PersonWithComputed[]>`

Returns all active prospects with no assigned rep. Used by the Admin Panel deactivate flow (to show count of prospects that need reassignment).

**Zoho implementation:** Filter from `getPeople()` where `assignedRepId` is null and stage is active.

---

## 5. Auto-Synced Activities (Telephony + Email)

### Reading Call Logs from Zoho Telephony

Zoho PhoneBridge automatically creates call log records when calls are made/received. These appear in Zoho's `Calls` module (standard module).

**Endpoint:** `GET {API_BASE}/Calls`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Calls?fields=Subject,Call_Type,Call_Duration,Call_Start_Time,Who_Id,Owner,Call_Status,Recording_URL&per_page=200&sort_by=Call_Start_Time&sort_order=desc" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

**To get calls for a specific contact:**
```bash
curl -X POST "https://www.zohoapis.com/crm/v6/coql" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "select_query": "SELECT Subject, Call_Type, Call_Duration, Call_Start_Time, Who_Id, Call_Status, Recording_URL FROM Calls WHERE Who_Id = '\''CONTACT_ID'\'' ORDER BY Call_Start_Time DESC LIMIT 200"
  }'
```

**Mapping to Activity type:**
```typescript
function mapZohoCallToActivity(call: any): Activity {
  const startTime = new Date(call.Call_Start_Time);
  const durationSeconds = parseDuration(call.Call_Duration); // "00:05:30" -> 330

  return {
    id: `call_${call.id}`,
    personId: call.Who_Id?.id || "",
    activityType: "call",
    source: "zoho_telephony",
    date: startTime.toISOString().split("T")[0],
    time: startTime.toTimeString().slice(0, 5), // "HH:MM"
    outcome: durationSeconds > 30 ? "connected" : "attempted",
    detail: `${call.Call_Type || "Call"}: ${call.Subject || "Phone call"} (${call.Call_Duration || "0:00"})`,
    documentsAttached: call.Recording_URL ? [`recording:${call.Recording_URL}`] : [],
    loggedById: call.Owner?.id || "",
    annotation: null,
  };
}

function parseDuration(duration: string | null): number {
  if (!duration) return 0;
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
```

**Outcome logic:**
- Duration > 30 seconds = `"connected"` (actual conversation happened)
- Duration <= 30 seconds = `"attempted"` (voicemail, no answer, wrong number)
- The 30-second threshold is configurable; store in env or system config.

---

### Reading Emails from Zoho (O365 Sync)

Zoho's O365 integration syncs emails and attaches them to matching Contact records. These are accessible via the Emails related list on a Contact.

**Endpoint:** `GET {API_BASE}/Contacts/{id}/Emails`

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/Contacts/CONTACT_ID/Emails" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

**Response fields:** `subject`, `from`, `to`, `cc`, `date_time`, `content` (body preview), `has_attachment`, `message_id`, `mail_format` (inbound/outbound/reply).

**Mapping to Activity type:**
```typescript
function mapZohoEmailToActivity(email: any, personId: string): Activity {
  const emailDate = new Date(email.date_time);
  const isReply = email.mail_format === "reply" ||
                  (email.in_reply_to && email.in_reply_to.length > 0);

  return {
    id: `email_${email.message_id || email.id}`,
    personId,
    activityType: "email",
    source: "o365_sync",
    date: emailDate.toISOString().split("T")[0],
    time: emailDate.toTimeString().slice(0, 5),
    outcome: isReply ? "connected" : "attempted",
    detail: `${email.from?.email === "our-domain" ? "Sent" : "Received"}: ${email.subject || "(no subject)"}\n\n${(email.content || "").slice(0, 500)}`,
    documentsAttached: email.has_attachment ? ["(email attachments)"] : [],
    loggedById: "", // System-generated
    annotation: null,
  };
}
```

**Outcome logic:**
- Email is a reply in a thread (two-way exchange) = `"connected"`
- Outbound email with no reply within 48 hours = `"attempted"`
- Inbound email (prospect initiated) = `"connected"`

### Unified Activity Feed

In `getActivities()` and `getRecentActivities()`, merge results from three sources:

1. **Activity_Logs module** (manual entries with `source = "manual"`)
2. **Calls module** (telephony entries, mapped with `source = "zoho_telephony"`)
3. **Contact Emails** (O365 synced, mapped with `source = "o365_sync"`)

Sort by date descending, then time descending.

```typescript
async getActivities(personId: string, filters?: ActivityFilters): Promise<Activity[]> {
  const [manualActivities, calls, emails] = await Promise.all([
    this.fetchActivityLogs(personId, filters),
    this.fetchCallsForContact(personId, filters),
    this.fetchEmailsForContact(personId, filters),
  ]);

  const all = [...manualActivities, ...calls, ...emails];

  // Sort by date desc, time desc
  all.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.time || "").localeCompare(a.time || "");
  });

  // Apply type filters if present
  if (filters?.activityTypes?.length) {
    return all.filter(a => filters.activityTypes!.includes(a.activityType));
  }

  return all;
}
```

---

## 6. Click-to-Call (PhoneBridge)

### Flow

1. User taps the phone icon on a prospect record
2. Frontend calls `POST /api/call/initiate` with `{ contactId, phoneNumber }`
3. API route calls Zoho PhoneBridge `make_call` API
4. Zoho triggers the call through the configured telephony provider
5. Call log is auto-captured by Zoho (appears as a Calls record)
6. On next data fetch, the call appears in the activity timeline

### API Route Implementation

Create `app/api/call/initiate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const { contactId, phoneNumber } = await req.json();

  // Get access token (reuse the zoho provider's token logic)
  const token = await getAccessToken();

  // Zoho PhoneBridge make_call API
  const response = await fetch(
    "https://phonebridge.zoho.com/api/v1/make_call",
    {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to_number: phoneNumber,
        from_number: session.userId, // Zoho maps user to their extension
        contact_id: contactId,
        module: "Contacts",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json({ error: "Call initiation failed", detail: error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### curl Example

```bash
curl -X POST "https://phonebridge.zoho.com/api/v1/make_call" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_number": "+12145550101",
    "from_number": "USER_EXTENSION_OR_ID",
    "contact_id": "ZOHO_CONTACT_ID",
    "module": "Contacts"
  }'
```

> **Note:** The exact PhoneBridge API endpoint and parameters depend on the telephony provider configured in Zoho. Check the Zoho PhoneBridge documentation for your specific provider (RingCentral, Twilio, etc.). The endpoint above is the standard Zoho PhoneBridge API; some providers expose their own endpoints through the PhoneBridge framework.

### Additional OAuth Scope

Add `ZohoPhoneBridge.ALL` to your OAuth scopes if using the PhoneBridge API directly.

---

## 7. Token Refresh

Zoho access tokens expire after 1 hour. Implement automatic refresh:

```typescript
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID!;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN!;

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (accessToken && Date.now() < tokenExpiresAt - 300_000) {
    return accessToken;
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    refresh_token: ZOHO_REFRESH_TOKEN,
  });

  const response = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoho token refresh failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000); // expires_in is in seconds

  return accessToken!;
}
```

### Wrapper for All Zoho API Calls

```typescript
async function zohoFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Handle token expiry mid-request (race condition)
  if (response.status === 401) {
    accessToken = null; // Force refresh
    const newToken = await getAccessToken();
    const retryResponse = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Zoho-oauthtoken ${newToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!retryResponse.ok) {
      throw new Error(`Zoho API error after retry: ${retryResponse.status} ${await retryResponse.text()}`);
    }
    return retryResponse.json();
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Zoho API error: ${response.status} ${errorBody}`);
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) return null;

  return response.json();
}
```

### Pagination Helper

Zoho returns max 200 records per page:

```typescript
async function zohoFetchAll(path: string, params: Record<string, string> = {}): Promise<any[]> {
  const allRecords: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const queryParams = new URLSearchParams({ ...params, page: String(page), per_page: "200" });
    const response = await zohoFetch(`${path}?${queryParams}`);

    if (response?.data) {
      allRecords.push(...response.data);
    }

    hasMore = response?.info?.more_records === true;
    page++;

    // Safety limit
    if (page > 50) break;
  }

  return allRecords;
}
```

---

## 8. Deduplication

> **Status: Fast-follow, not required for launch.**

When both manual logging and auto-capture are active, the same interaction may appear twice (e.g., Chad manually logs "Called Robert" AND Zoho Telephony auto-captures the call).

### Recommended Approach

When building the merged activity feed in `getActivities()`, apply deduplication:

```typescript
function deduplicateActivities(activities: Activity[]): Activity[] {
  const seen = new Map<string, Activity>();

  for (const activity of activities) {
    // Build a dedup key: same person + same type + within 5 minutes
    const key = `${activity.personId}_${activity.activityType}_${activity.date}`;

    if (seen.has(key)) {
      const existing = seen.get(key)!;
      // Check if timestamps are within 5 minutes
      if (areWithin5Minutes(existing.time, activity.time)) {
        // Keep the manual entry (richer detail), mark auto as duplicate
        if (activity.source === "manual") {
          seen.set(key, activity);
        }
        // If existing is manual, skip this auto entry
        continue;
      }
    }

    seen.set(`${key}_${activity.time}`, activity);
  }

  return Array.from(seen.values());
}

function areWithin5Minutes(time1: string | null, time2: string | null): boolean {
  if (!time1 || !time2) return true; // If no time, assume same window
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2)) <= 5;
}
```

### Rules

- Match by: same `personId` + same `activityType` (call/email) + timestamp within 5 minutes
- When duplicate found: keep the **manual** entry (it has richer detail from the rep), discard the auto entry
- For emails: match by same `personId` + `activityType = email` + `source` differs + timestamp within 5 minutes

---

## 9. Testing Checklist

> **Automated testing:** Run `DATA_PROVIDER=zoho npx tsx scripts/test-provider.ts` to verify all 33 provider-level tests pass. Then run `npx playwright test` with the dev server on `DATA_PROVIDER=zoho` to verify all 94 E2E tests pass. See Section 0 for the full testing strategy.

Manual verification checklist (for anything the automated tests don't cover):

### People (Contacts)

- [ ] `getPeople()` — returns all contacts with correct field mapping
- [ ] `getPeople({ pipelineStages: ["active_engagement"] })` — filters correctly
- [ ] `getPeople({ assignedRepId: "USER_ID" })` — filters by owner
- [ ] `getPeople({ staleOnly: true })` — computes stale flag correctly
- [ ] `getPeople({ search: "calloway" })` — search works
- [ ] `getPerson("ID")` — returns single enriched record with computed fields
- [ ] `createPerson(...)` — creates contact with all custom fields populated
- [ ] `updatePerson("ID", { pipelineStage: "soft_commit", committedAmount: 250000, commitmentDate: "2026-03-17" })` — updates stage and commitment
- [ ] `searchPeople("call")` — returns fuzzy matches

### Referrer & Related Contact Links

- [ ] `addReferrer(prospectId, referrerId)` — creates junction record
- [ ] `getReferrals(referrerId)` — returns linked prospects
- [ ] `getReferrerForProspect(prospectId)` — returns the referrer person
- [ ] `addRelatedContact(prospectId, contactId, "CPA")` — creates junction record
- [ ] `getRelatedContacts(prospectId)` — returns contacts with role

### Organizations (Accounts)

- [ ] `getOrganizations()` — returns all accounts
- [ ] `getOrganization("ID")` — returns single account
- [ ] `createOrganization({ name: "Test Org", type: "family_office" })` — creates account
- [ ] `searchOrganizations("calloway")` — returns matches

### Funding Entities

- [ ] `getFundingEntities(personId)` — returns entities for a contact
- [ ] `createFundingEntity(...)` — creates entity linked to contact

### Activities

- [ ] `getActivities(personId)` — returns merged manual + telephony + email activities
- [ ] `getActivities(personId, { activityTypes: ["call"] })` — type filter works
- [ ] `getActivities(personId, { dateFrom: "2026-03-01", dateTo: "2026-03-17" })` — date filter works
- [ ] `getRecentActivities({ limit: 10 })` — cross-prospect feed returns correct data
- [ ] `getRecentActivities({ repId: "USER_ID" })` — filtered by rep
- [ ] `createActivity(personId, { activityType: "call", outcome: "connected", detail: "..." })` — creates manual activity

### Auto-Synced Activities

- [ ] Telephony call logs appear with `source: "zoho_telephony"` and correct outcome
- [ ] Call duration > 30s maps to `outcome: "connected"`
- [ ] Call duration <= 30s maps to `outcome: "attempted"`
- [ ] Recording URL is accessible from the activity detail
- [ ] O365 synced emails appear with `source: "o365_sync"`
- [ ] Email replies map to `outcome: "connected"`
- [ ] Outbound-only emails map to `outcome: "attempted"`

### Funded Investments

- [ ] `getFundedInvestments()` — returns all investments
- [ ] `createFundedInvestment(...)` — creates investment linked to entity + contact

### Dashboard

- [ ] `getDashboardStats()` — returns correct counts and sums
- [ ] Active pipeline count excludes Funded/Nurture/Dead
- [ ] Committed value only sums Soft Commit + Commitment Processing + KYC stages
- [ ] Funded YTD only counts current year

### Users

- [ ] `getUsers()` — returns all active CRM users
- [ ] User role mapping works (Administrator -> admin, etc.)

### Click-to-Call

- [ ] `POST /api/call/initiate` triggers PhoneBridge
- [ ] Call log appears in Zoho Calls module after call
- [ ] Call log appears in activity timeline on next fetch

### Token Management

- [ ] Access token refreshes automatically on expiry
- [ ] 401 response triggers single retry with fresh token
- [ ] Invalid refresh token produces clear error message

---

## 10. Environment Variables — Complete Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATA_PROVIDER` | Yes | Set to `zoho` to use Zoho provider | `zoho` |
| `ZOHO_CLIENT_ID` | Yes | OAuth Self Client ID from API Console | `1000.ABCDEF123456` |
| `ZOHO_CLIENT_SECRET` | Yes | OAuth Self Client Secret | `abcdef123456789` |
| `ZOHO_REFRESH_TOKEN` | Yes | Long-lived refresh token (never expires) | `1000.abc123.def456` |
| `ZOHO_ORG_ID` | Yes | Zoho CRM Organization ID | `123456789` |
| `ZOHO_API_BASE` | No | API base URL. Default: `https://www.zohoapis.com/crm/v6` | `https://www.zohoapis.eu/crm/v6` |
| `ZOHO_ACCOUNTS_URL` | No | Accounts URL for token refresh. Default: `https://accounts.zoho.com` | `https://accounts.zoho.eu` |
| `CALL_CONNECTED_THRESHOLD` | No | Seconds threshold for call outcome. Default: `30` | `30` |
| `JWT_SECRET` | Yes | Session JWT secret (existing, not Zoho-specific) | `your-secret-here` |

### Finding Your Org ID

```bash
curl -X GET "https://www.zohoapis.com/crm/v6/org" \
  -H "Authorization: Zoho-oauthtoken ACCESS_TOKEN"
```

The response `data[0].id` is your `ZOHO_ORG_ID`.

---

## Appendix: Zoho Picklist Value Mapping

When writing picklist values TO Zoho, use title case with spaces. When reading FROM Zoho, convert to snake_case.

| Our Value (snake_case) | Zoho Value (Title Case) |
|---|---|
| `prospect` | `Prospect` |
| `initial_contact` | `Initial Contact` |
| `discovery` | `Discovery` |
| `pitch` | `Pitch` |
| `active_engagement` | `Active Engagement` |
| `soft_commit` | `Soft Commit` |
| `commitment_processing` | `Commitment Processing` |
| `kyc_docs` | `KYC / Docs` |
| `funded` | `Funded` |
| `nurture` | `Nurture` |
| `dead` | `Dead / Lost` |
| `follow_up` | `Follow Up` |
| `schedule_meeting` | `Schedule Meeting` |
| `send_document` | `Send Document` |
| `request_info` | `Request Info` |
| `make_introduction` | `Make Introduction` |
| `internal_review` | `Internal Review` |
| `velocis_network` | `Velocis Network` |
| `cpa_referral` | `CPA Referral` |
| `legacy_event` | `Legacy Event` |
| `linkedin` | `LinkedIn` |
| `ken_dbj_list` | `Ken - DBJ List` |
| `ken_event_followup` | `Ken - Event Follow-up` |
| `tolleson_wm` | `Tolleson WM` |
| `ma_attorney` | `M&A Attorney` |
| `cold_outreach` | `Cold Outreach` |
| `not_accredited` | `Not Accredited` |
| `not_interested` | `Not Interested` |
| `ghosted` | `Ghosted` |
| `timing` | `Timing` |
| `went_elsewhere` | `Went Elsewhere` |
| `llc` | `LLC` |
| `llp` | `LLP` |
| `trust` | `Trust` |
| `individual` | `Individual` |
| `corporation` | `Corporation` |
| `active` | `Active` |
| `pending_setup` | `Pending Setup` |
| `inactive` | `Inactive` |
| `maintain` | `Maintain` |
| `grow` | `Grow` |
| `family_office` | `Family Office` |
| `wealth_management` | `Wealth Management` |
| `corporate` | `Corporate` |
| `individual_none` | `Individual/None` |
| `cpa` | `CPA` |
| `attorney` | `Attorney` |
| `wealth_advisor` | `Wealth Advisor` |
| `spouse` | `Spouse` |
| `existing_investor` | `Existing Investor` |
| `manual` | `Manual` |
| `zoho_telephony` | `Zoho Telephony` |
| `o365_sync` | `O365 Sync` |
| `connected` | `Connected` |
| `attempted` | `Attempted` |

> **Special cases:** `kyc_docs` maps to `KYC / Docs` and `dead` maps to `Dead / Lost`. The generic `toTitleCase()` helper won't handle these — add explicit mappings for these values.
