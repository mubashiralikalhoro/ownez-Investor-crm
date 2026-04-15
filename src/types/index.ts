// ─── Zoho CRM — Prospects module ─────────────────────────────────────────────

export type ZohoOwner = {
  id: string;
  name: string;
  email: string;
};

/** A single row returned by the Prospects module (GET /crm/v8/Prospects). */
export type ZohoProspect = {
  id: string;
  Name: string;
  Email: string | null;
  Phone: string | null;
  Owner: ZohoOwner;
  Pipeline_Stage: string | null;
  Lead_Source: string | null;
  Next_Action: string | null;
  Next_Action_Date: string | null;          // "YYYY-MM-DD"
  Days_Since_Last_Touch: number | null;
  Stale_Flag: boolean;
  Initial_Investment_Target: number | null;
  Committed_Amount: number | null;
  Growth_Target: number | null;
  Company_Entity: string | null;
};

/** Pagination info returned alongside every list response. */
export type ZohoPaginationInfo = {
  page: number;
  per_page: number;
  count: number;
  more_records: boolean;
  sort_by: string;
  sort_order: "asc" | "desc";
  next_page_token: string | null;
  previous_page_token: string | null;
  page_token_expiry: string | null;
};

/** Shape returned by getProspectsList. */
export type ProspectsListResult = {
  data: ZohoProspect[];
  info: ZohoPaginationInfo;
};

/** Full detail record returned by GET /Prospect/{id}. */
export type ZohoProspectDetail = {
  id: string;
  Name: string;
  Email: string | null;
  Phone: string | null;
  Owner: ZohoOwner;
  Pipeline_Stage: string | null;
  Lead_Source: string | null;
  Add_Lead_Source: string | null;
  Next_Action: string | null;
  Next_Action_Date: string | null;
  Days_Since_Last_Touch: number | null;
  Last_Activity_Time: string | null;
  Last_Activity_Date: string | null;
  Initial_Investment_Target: number | null;
  Growth_Target: number | null;
  Committed_Amount: number | null;
  Company_Entity: string | null;
  Lost_Dead_Reason: string | null;
  Stale_Flag: boolean;
  isArchived: boolean;
  Locked__s: boolean;
  Unsubscribed_Mode: string | null;
  Unsubscribed_Time: string | null;
  Created_Time: string | null;
  Modified_Time: string | null;
  Created_By: { name: string; id: string; email: string } | null;
  Modified_By: { name: string; id: string; email: string } | null;
  Funded_Investor: { name: string; id: string } | null;
  Record_Status__s: string | null;
  Tag: string[];
  Currency: string | null;
};

/** A note on a Prospect record (GET /Prospect/{id}/Notes). */
export type ZohoNote = {
  id: string;
  Note_Title: string | null;
  Note_Content: string | null;
  Created_Time: string;
  Modified_Time: string | null;
  Created_By: { name: string; id: string; email?: string } | null;
  Modified_By: { name: string; id: string; email?: string } | null;
  Owner: { name: string; id: string; email?: string } | null;
  Parent_Id: {
    name: string;
    id: string;
    module: { api_name: string; id: string };
  } | null;
};

/** Automation details on a timeline event — can be a custom function or a workflow rule. */
export type ZohoAutomationDetails =
  | {
      /** Custom function: has top-level name/id/type */
      name: string;
      id: string;
      type: "functions";
    }
  | {
      /** Workflow rule: has rule sub-object and optional workflow field-update actions */
      type: "workflow_rule";
      rule: { name: string; id: string };
      workflow?: {
        field_update_action?: { name: string; id: string }[];
      };
    };

/** One entry from the __timeline endpoint (GET /Prospect/{id}/__timeline). */
export type ZohoTimelineEvent = {
  id: string;
  action: string;
  done_by: {
    name: string;
    id: string;
    email?: string;
    profile?: { name: string; id: string };
    type__s?: string;
  } | null;
  audited_time: string;
  source?: string;
  type?: string;
  record?: {
    name: string;
    id: string | null;
    module?: { api_name: string; id: string | null };
  } | null;
  related_record?: {
    name: string;
    id: string;
    module?: { api_name: string; id: string };
  } | null;
  automation_details?: ZohoAutomationDetails | null;
  field_history?: {
    id: string;
    api_name: string;
    field_label: string;
    data_type?: string;
    /** Actual Zoho shape: _value.new / _value.old */
    _value: { new: string | null; old: string | null };
  }[] | null;
};

/** Email record from GET /Prospect/{id}/Emails. Response key is "Emails" (not "data"). */
export type ZohoEmail = {
  message_id: string;
  subject: string | null;
  from: { user_name: string; email: string } | null;
  to: { user_name: string; email: string }[];
  cc?: { user_name: string; email: string }[];
  sent_time: string | null;   // ISO datetime (preferred when present)
  date_time?: string | null;  // alternative ISO datetime field
  time?: string | null;       // ISO datetime; populated for IMAP-sourced emails
  summary?: string | null;    // plain-text preview
  content?: string | null;    // HTML full body
};

/** Call record from GET /Prospect/{id}/Calls or GET /Calls. Response key is "data". */
export type ZohoCall = {
  id: string;
  Subject: string | null;
  Call_Agenda: string | null;
  Call_Purpose: string | null;
  Call_Status: string | null;       // e.g. "Scheduled", "Completed"
  Call_Start_Time: string | null;   // ISO datetime
  Call_Duration: string | null;     // e.g. "0:10"
  Call_Duration_In_Seconds?: number | null;
  Call_Type: string | null;         // "Inbound" | "Outbound"
  Description: string | null;
  Owner: { name: string; id: string; email: string } | null;
  Created_By: { name: string; id: string; email?: string } | null;
  Who_Id: { name: string; id: string } | null;
  What_Id: { name: string; id: string } | null;
  Modified_Time: string | null;
  Created_Time: string | null;
};

/** Event/Meeting record from GET /Prospect/{id}/Events or GET /Events. Response key is "data". */
export type ZohoEvent = {
  id: string;
  Event_Title: string | null;
  Start_DateTime: string | null;    // ISO datetime
  End_DateTime: string | null;      // ISO datetime
  Description: string | null;
  Owner: { name: string; id: string; email: string } | null;
  Created_By: { name: string; id: string; email?: string } | null;
  Venue: string | null;
  All_Day: boolean;
  Modified_Time: string | null;
  Created_Time: string | null;
  What_Id?: { name: string; id: string } | null;
};

/** Pipeline Stage History entry from GET /Prospect/{id}/Pipeline_Stage_History. */
export type ZohoStageHistory = {
  id: string;
  Pipeline_Stage: string | null;
  Duration_Days: number | null;
  Modified_Time: string | null;
  Modified_By: { name: string; id: string; email: string } | null;
  Next_Action: string | null;
  Next_Action_Date: string | null;
};

/** Attachment record from GET /Prospect/{id}/Attachments. */
export type ZohoAttachment = {
  id: string;
  File_Name: string | null;
  Size: string | null;
  Created_Time: string | null;
  Created_By: { name: string; id: string; email: string } | null;
};

/** Task record from GET /Prospect/{id}/Tasks. */
export type ZohoTask = {
  id: string;
  Subject: string | null;
  Status: string | null;      // "Not Started" | "In Progress" | "Completed" | "Waiting on input" | "Deferred"
  Priority: string | null;    // "High" | "Normal" | "Low"
  Due_Date: string | null;    // "YYYY-MM-DD"
  Closed_Time: string | null; // ISO datetime when completed
  Description: string | null;
  Owner: { name: string; id: string; email: string } | null;
};

/** Funded Investor linked record from GET /Prospect/{id}/Funded. */
export type ZohoFundedRecord = {
  id: string;
  Name: string | null;
  Email: string | null;
  Owner: { name: string; id: string; email: string } | null;
};

/** Server-side filter params passed through to Zoho CRM. */
export type ProspectFilters = {
  /** Full-text word search (maps to Zoho /search?word=). */
  search?: string;
  /** Zoho Pipeline_Stage exact match. */
  pipelineStage?: string;
  /** Zoho Lead_Source exact match. */
  leadSource?: string;
  /** Zoho Owner.id exact match. */
  ownerId?: string;
  /** When true, adds (Pipeline_Stage:not_equal:Funded) to the criteria. */
  excludeFunded?: boolean;
};
