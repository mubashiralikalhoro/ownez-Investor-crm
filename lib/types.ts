// ─── Core Entities ───

export type PersonRole = "prospect" | "referrer" | "related_contact" | "funded_investor";

export type PipelineStage =
  | "prospect"
  | "initial_contact"
  | "discovery"
  | "pitch"
  | "active_engagement"
  | "soft_commit"
  | "commitment_processing"
  | "kyc_docs"
  | "funded"
  | "nurture"
  | "dead";

export type NextActionType =
  | "follow_up"
  | "schedule_meeting"
  | "send_document"
  | "request_info"
  | "make_introduction"
  | "internal_review"
  | "other";

export type LeadSource =
  | "velocis_network"
  | "cpa_referral"
  | "legacy_event"
  | "linkedin"
  | "ken_dbj_list"
  | "ken_event_followup"
  | "tolleson_wm"
  | "ma_attorney"
  | "cold_outreach"
  | "other";

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "text_message"
  | "linkedin_message"
  | "whatsapp"
  | "stage_change"
  | "document_sent"
  | "document_received"
  | "reassignment";

export type ActivitySource = "manual" | "zoho_telephony" | "o365_sync";
export type ActivityOutcome = "connected" | "attempted";

export type EntityType = "llc" | "llp" | "trust" | "individual" | "corporation" | "other";
export type EntityStatus = "active" | "pending_setup" | "inactive";
export type InvestmentTrack = "maintain" | "grow";
export type LostReason = "not_accredited" | "not_interested" | "ghosted" | "timing" | "went_elsewhere" | "other";
export type OrgType = "family_office" | "wealth_management" | "corporate" | "individual_none";
export type ContactType = "cpa" | "attorney" | "wealth_advisor" | "spouse" | "existing_investor" | "other";
export type UserRole = "rep" | "marketing" | "admin";

// ─── Data Models ───

export interface Person {
  id: string;
  fullName: string;
  createdDate: string;
  email: string | null;
  phone: string | null;
  organizationId: string | null;
  roles: PersonRole[];

  pipelineStage: PipelineStage | null;
  stageChangedDate: string | null;
  initialInvestmentTarget: number | null;
  growthTarget: number | null;
  committedAmount: number | null;
  commitmentDate: string | null;
  nextActionType: NextActionType | null;
  nextActionDetail: string | null;
  nextActionDate: string | null;
  leadSource: LeadSource | null;
  assignedRepId: string | null;
  collaboratorIds: string[];
  notes: string | null;
  lostReason: LostReason | null;
  reengageDate: string | null;

  contactType: ContactType | null;
  contactCompany: string | null;
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType | null;
  notes: string | null;
}

export interface FundingEntity {
  id: string;
  entityName: string;
  entityType: EntityType;
  personId: string;
  status: EntityStatus;
  einTaxId: string | null;
  notes: string | null;
}

export interface Activity {
  id: string;
  personId: string;
  activityType: ActivityType;
  source: ActivitySource;
  date: string;
  time: string | null;
  outcome: ActivityOutcome;
  detail: string;
  documentsAttached: string[];
  loggedById: string;
  annotation: string | null;
}

export interface FundedInvestment {
  id: string;
  fundingEntityId: string;
  personId: string;
  amountInvested: number;
  investmentDate: string;
  track: InvestmentTrack;
  growthTarget: number | null;
  nextCheckInDate: string;
  notes: string | null;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  passwordHash: string;
}

// ─── Relationship Links ───

export interface ReferrerLink {
  prospectId: string;
  referrerId: string;
}

export interface RelatedContactLink {
  prospectId: string;
  contactId: string;
  role: string;
}

// ─── Computed / View Models ───

export interface PersonWithComputed extends Person {
  organizationName: string | null;
  assignedRepName: string | null;
  daysSinceLastTouch: number | null;
  isStale: boolean;
  isOverdue: boolean;
  activityCount: number;
  referrerName: string | null;
}

// ─── Dashboard Stats ───

export interface DashboardStats {
  activePipelineCount: number;
  pipelineValue: number;
  committedValue: number;
  fundedYTD: number;
}

// ─── Data Service Interface ───

export interface PeopleFilters {
  roles?: PersonRole[];
  pipelineStages?: PipelineStage[];
  leadSources?: LeadSource[];
  assignedRepId?: string;
  staleOnly?: boolean;
  search?: string;
}

export interface ActivityFilters {
  activityTypes?: ActivityType[];
  dateFrom?: string;
  dateTo?: string;
}

export interface RecentActivityFilters {
  repId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface RecentActivityEntry extends Activity {
  personName: string;
  personId: string;
}

export interface DataService {
  // People
  getPeople(filters?: PeopleFilters): Promise<PersonWithComputed[]>;
  getPerson(id: string): Promise<PersonWithComputed | null>;
  createPerson(data: Partial<Person>): Promise<Person>;
  updatePerson(id: string, data: Partial<Person>): Promise<Person>;
  searchPeople(query: string): Promise<PersonWithComputed[]>;

  // Activities
  getActivities(personId: string, filters?: ActivityFilters): Promise<Activity[]>;
  getRecentActivities(filters?: RecentActivityFilters): Promise<RecentActivityEntry[]>;
  createActivity(personId: string, data: Omit<Activity, "id" | "personId">): Promise<Activity>;

  // Funding Entities
  getFundingEntities(personId: string): Promise<FundingEntity[]>;
  createFundingEntity(data: Omit<FundingEntity, "id">): Promise<FundingEntity>;

  // Organizations
  getOrganizations(): Promise<Organization[]>;
  searchOrganizations(query: string): Promise<Organization[]>;
  createOrganization(data: Omit<Organization, "id">): Promise<Organization>;

  // Funded Investments
  getFundedInvestments(personId: string): Promise<FundedInvestment[]>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Users
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | null>;

  // Relationships
  getReferrerForProspect(prospectId: string): Promise<Person | null>;
  getRelatedContacts(prospectId: string): Promise<(Person & { relationRole: string })[]>;
  addReferrer(prospectId: string, referrerId: string): Promise<void>;
  addRelatedContact(prospectId: string, contactId: string, role: string): Promise<void>;
  getReferrals(referrerId: string): Promise<PersonWithComputed[]>;

  // Analytics
  getLeadSourceCounts(): Promise<Record<string, number>>;

  // Testing
  resetData?(): void;
}
