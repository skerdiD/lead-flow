import { loadEnvConfig } from "@next/env";
import { and, eq, inArray, not, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  accounts,
  activityEvents,
  contacts,
  crmTasks,
  deals,
  leadNotes,
  leads,
  workspaceMembers,
  workspaces,
  type dealStages,
  type leadStatuses,
  type taskPriorities,
  type taskStatuses,
} from "../db/schema";

loadEnvConfig(process.cwd());

const TARGET_EMAIL = "skerdi0005@gmail.com";
const DEMO_WORKSPACE_NAME = "Lead Flow Demo Workspace";
const DEMO_EMAIL_DOMAIN = "leadflow-demo.example";

type LeadStatus = (typeof leadStatuses)[number];
type DealStage = (typeof dealStages)[number];
type TaskStatus = (typeof taskStatuses)[number];
type TaskPriority = (typeof taskPriorities)[number];
type ActivityEventType =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_note_added"
  | "task_created"
  | "task_completed"
  | "deal_stage_changed"
  | "lead_qualified";

type SeedLead = {
  contactName: string;
  title: string;
  company: string;
  industry: string;
  website: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  notes: string;
  dealName: string;
  dealStage: DealStage;
  dealValue: number;
  probability: number;
  expectedCloseOffsetDays?: number;
  closedOffsetDays?: number;
  lostReason?: string;
  createdOffsetDays: number;
  noteEntries: string[];
  tasks: Array<{
    title: string;
    description: string;
    dueOffsetDays: number;
    status: TaskStatus;
    priority: TaskPriority;
  }>;
};

const seedLeads: SeedLead[] = [
  {
    contactName: "Ava Moreno",
    title: "VP Operations",
    company: "Northstar Fabrication",
    industry: "Manufacturing",
    website: "https://northstarfabrication.example",
    email: `ava.moreno@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (415) 555-0138",
    status: "Proposal Sent",
    source: "Referral",
    notes:
      "Evaluating a CRM rollout for three regional sales teams. Strong executive sponsor and clear budget window.",
    dealName: "Regional CRM Rollout",
    dealStage: "proposal",
    dealValue: 48000,
    probability: 72,
    expectedCloseOffsetDays: 12,
    createdOffsetDays: -24,
    noteEntries: [
      "Proposal reviewed with operations and finance. Ava asked for a phased onboarding option.",
      "Security checklist received. No blockers identified for CRM data model.",
    ],
    tasks: [
      {
        title: "Send phased onboarding plan",
        description: "Include implementation milestones and first-month success metrics.",
        dueOffsetDays: 2,
        status: "pending",
        priority: "high",
      },
    ],
  },
  {
    contactName: "Julian Park",
    title: "Founder",
    company: "Brightline Studio",
    industry: "Creative Services",
    website: "https://brightlinestudio.example",
    email: `julian.park@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (646) 555-0196",
    status: "Closed",
    source: "Website",
    notes:
      "Founder-led agency needed a lighter pipeline workflow for inbound retainers. Closed after product walkthrough.",
    dealName: "Agency Pipeline Workspace",
    dealStage: "won",
    dealValue: 18500,
    probability: 100,
    closedOffsetDays: -5,
    createdOffsetDays: -21,
    noteEntries: [
      "Contract signed for annual plan. First workspace review scheduled with account lead.",
      "Julian liked activity tracking and PDF exports for client reporting.",
    ],
    tasks: [
      {
        title: "Schedule kickoff call",
        description: "Confirm users, import format, and dashboard goals.",
        dueOffsetDays: 4,
        status: "pending",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Maya Chen",
    title: "Head of Growth",
    company: "Atlas Health Labs",
    industry: "Healthcare Technology",
    website: "https://atlashealthlabs.example",
    email: `maya.chen@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (312) 555-0124",
    status: "Interested",
    source: "LinkedIn",
    notes:
      "Growth team is consolidating lead capture from campaigns, partner referrals, and outbound experiments.",
    dealName: "Growth Pipeline Consolidation",
    dealStage: "qualified",
    dealValue: 36500,
    probability: 58,
    expectedCloseOffsetDays: 21,
    createdOffsetDays: -18,
    noteEntries: [
      "Discovery call confirmed need for source reporting and weighted forecast visibility.",
      "Maya wants a sample CSV export before involving RevOps.",
    ],
    tasks: [
      {
        title: "Share sample import template",
        description: "Include sources, deal value, probability, and notes columns.",
        dueOffsetDays: 1,
        status: "pending",
        priority: "high",
      },
    ],
  },
  {
    contactName: "Ethan Brooks",
    title: "Sales Director",
    company: "Summit CloudWorks",
    industry: "SaaS",
    website: "https://summitcloudworks.example",
    email: `ethan.brooks@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (206) 555-0182",
    status: "Contacted",
    source: "Cold Email",
    notes:
      "Outbound reply from sales director. Team is replacing a spreadsheet-heavy renewal tracker.",
    dealName: "Renewal Tracker Migration",
    dealStage: "contacted",
    dealValue: 22000,
    probability: 35,
    expectedCloseOffsetDays: 33,
    createdOffsetDays: -14,
    noteEntries: [
      "Ethan asked for examples of task reminders and activity history.",
    ],
    tasks: [
      {
        title: "Book discovery workshop",
        description: "Focus on renewal handoffs and dashboard visibility.",
        dueOffsetDays: 3,
        status: "pending",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Priya Nair",
    title: "COO",
    company: "Meridian Legal Group",
    industry: "Legal Services",
    website: "https://meridianlegal.example",
    email: `priya.nair@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (212) 555-0117",
    status: "Proposal Sent",
    source: "Partner",
    notes:
      "Partner referral. Firm needs visibility into consultation requests, follow-ups, and signed matters.",
    dealName: "Consultation Intake Pipeline",
    dealStage: "proposal",
    dealValue: 29500,
    probability: 67,
    expectedCloseOffsetDays: 18,
    createdOffsetDays: -27,
    noteEntries: [
      "Pricing proposal sent with two implementation options.",
      "COO requested a weekly source-performance view for leadership.",
    ],
    tasks: [
      {
        title: "Follow up on proposal questions",
        description: "Clarify user count, import timing, and reporting cadence.",
        dueOffsetDays: -1,
        status: "pending",
        priority: "high",
      },
    ],
  },
  {
    contactName: "Noah Williams",
    title: "Managing Partner",
    company: "HarborPoint Advisors",
    industry: "Financial Services",
    website: "https://harborpointadvisors.example",
    email: `noah.williams@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (617) 555-0155",
    status: "Lost",
    source: "Referral",
    notes:
      "Good fit, but procurement chose to extend the current contract for another quarter.",
    dealName: "Advisor Lead Management",
    dealStage: "lost",
    dealValue: 42000,
    probability: 0,
    closedOffsetDays: -8,
    lostReason: "Timing pushed to next quarter",
    createdOffsetDays: -31,
    noteEntries: [
      "Noah asked to reconnect when the renewal window opens.",
    ],
    tasks: [
      {
        title: "Reconnect next quarter",
        description: "Send revised business case before renewal planning.",
        dueOffsetDays: 45,
        status: "pending",
        priority: "low",
      },
    ],
  },
  {
    contactName: "Sofia Alvarez",
    title: "Director of Enrollment",
    company: "Cedar Grove Academy",
    industry: "Education",
    website: "https://cedargroveacademy.example",
    email: `sofia.alvarez@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (303) 555-0141",
    status: "Interested",
    source: "Website",
    notes:
      "Enrollment team wants a cleaner way to track open-house inquiries and follow-up tasks.",
    dealName: "Admissions Lead Desk",
    dealStage: "qualified",
    dealValue: 15400,
    probability: 52,
    expectedCloseOffsetDays: 27,
    createdOffsetDays: -12,
    noteEntries: [
      "Walkthrough covered source filters and lead status changes.",
      "Sofia wants parent inquiry examples in the import sample.",
    ],
    tasks: [
      {
        title: "Send education workflow examples",
        description: "Map inquiry, visit, application, and enrollment stages.",
        dueOffsetDays: 5,
        status: "pending",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Liam Carter",
    title: "Owner",
    company: "Evergreen Solar Co.",
    industry: "Renewable Energy",
    website: "https://evergreensolar.example",
    email: `liam.carter@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (503) 555-0168",
    status: "New",
    source: "Upwork",
    notes:
      "New inbound request for a sales workspace to track residential estimates and installer handoffs.",
    dealName: "Residential Estimate Tracker",
    dealStage: "new",
    dealValue: 12800,
    probability: 18,
    expectedCloseOffsetDays: 40,
    createdOffsetDays: -2,
    noteEntries: ["Lead imported from Upwork conversation summary."],
    tasks: [
      {
        title: "Qualify estimate workflow",
        description: "Confirm lead volume, handoff process, and reporting needs.",
        dueOffsetDays: 1,
        status: "pending",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Grace Kim",
    title: "Marketing Manager",
    company: "Bluepeak Hospitality",
    industry: "Hospitality",
    website: "https://bluepeakhospitality.example",
    email: `grace.kim@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (702) 555-0109",
    status: "Contacted",
    source: "LinkedIn",
    notes:
      "Marketing team wants to connect event inquiries with account-level notes and task ownership.",
    dealName: "Event Inquiry Pipeline",
    dealStage: "contacted",
    dealValue: 24100,
    probability: 32,
    expectedCloseOffsetDays: 36,
    createdOffsetDays: -9,
    noteEntries: [
      "Grace responded positively to dashboard screenshots and asked for a short demo.",
    ],
    tasks: [
      {
        title: "Run 20-minute product demo",
        description: "Show event lead table, filters, and activity timeline.",
        dueOffsetDays: 6,
        status: "pending",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Owen Reed",
    title: "Revenue Operations Lead",
    company: "Pulse Retail Systems",
    industry: "Retail Technology",
    website: "https://pulseretailsystems.example",
    email: `owen.reed@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (512) 555-0172",
    status: "Closed",
    source: "Partner",
    notes:
      "RevOps team selected Lead Flow for a lightweight pilot with high-value retail partners.",
    dealName: "Partner Sales Pilot",
    dealStage: "won",
    dealValue: 57500,
    probability: 100,
    closedOffsetDays: -2,
    createdOffsetDays: -19,
    noteEntries: [
      "Pilot approved. Initial workspace will focus on partner opportunities above $10k.",
      "Owen requested won/lost reporting for the month-end review.",
    ],
    tasks: [
      {
        title: "Prepare pilot kickoff checklist",
        description: "Include migration steps, owner roles, and success criteria.",
        dueOffsetDays: 2,
        status: "pending",
        priority: "high",
      },
    ],
  },
  {
    contactName: "Nina Patel",
    title: "Practice Manager",
    company: "Willow Dental Partners",
    industry: "Healthcare Services",
    website: "https://willowdentalpartners.example",
    email: `nina.patel@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (404) 555-0188",
    status: "New",
    source: "Website",
    notes:
      "Website inquiry asking for a simple way to track new patient consultations and pending follow-ups.",
    dealName: "Patient Consultation Tracker",
    dealStage: "new",
    dealValue: 9600,
    probability: 20,
    expectedCloseOffsetDays: 29,
    createdOffsetDays: -1,
    noteEntries: ["Auto-captured from website contact form."],
    tasks: [
      {
        title: "Reply with discovery times",
        description: "Offer two appointment windows and ask about current lead volume.",
        dueOffsetDays: 1,
        status: "pending",
        priority: "high",
      },
    ],
  },
  {
    contactName: "Marcus Bennett",
    title: "Business Development Lead",
    company: "Ironvale Logistics",
    industry: "Logistics",
    website: "https://ironvalelogistics.example",
    email: `marcus.bennett@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (901) 555-0132",
    status: "Interested",
    source: "Cold Email",
    notes:
      "BD team is looking for a focused CRM layer to replace shared spreadsheets for shipper opportunities.",
    dealName: "Shipper Opportunity Desk",
    dealStage: "qualified",
    dealValue: 31800,
    probability: 55,
    expectedCloseOffsetDays: 14,
    createdOffsetDays: -16,
    noteEntries: [
      "Discovery confirmed pain around missed follow-ups and unclear deal ownership.",
    ],
    tasks: [
      {
        title: "Send ROI summary",
        description: "Frame value around faster follow-up and cleaner owner accountability.",
        dueOffsetDays: -2,
        status: "completed",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Elena Rossi",
    title: "Director of Client Success",
    company: "Quartz Analytics",
    industry: "Data Services",
    website: "https://quartzanalytics.example",
    email: `elena.rossi@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (718) 555-0148",
    status: "Proposal Sent",
    source: "Upwork",
    notes:
      "Client success team needs a compact CRM to manage expansion conversations and track next steps.",
    dealName: "Expansion Pipeline Workspace",
    dealStage: "proposal",
    dealValue: 26800,
    probability: 64,
    expectedCloseOffsetDays: 9,
    createdOffsetDays: -22,
    noteEntries: [
      "Proposal sent after workflow review. Elena asked about exporting leadership-ready reports.",
    ],
    tasks: [
      {
        title: "Send PDF export example",
        description: "Include lead table, source summary, and revenue forecast.",
        dueOffsetDays: 2,
        status: "pending",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Caleb Morgan",
    title: "General Manager",
    company: "Redwood Field Services",
    industry: "Field Services",
    website: "https://redwoodfieldservices.example",
    email: `caleb.morgan@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (816) 555-0161",
    status: "Lost",
    source: "LinkedIn",
    notes:
      "Field services team liked the pipeline view but chose a bundled operations suite for now.",
    dealName: "Field Estimate CRM",
    dealStage: "lost",
    dealValue: 21400,
    probability: 0,
    closedOffsetDays: -12,
    lostReason: "Chose bundled operations platform",
    createdOffsetDays: -28,
    noteEntries: [
      "Caleb said the dashboard was stronger, but procurement preferred one vendor.",
    ],
    tasks: [
      {
        title: "Archive feedback for positioning",
        description: "Use notes to refine comparison against operations suites.",
        dueOffsetDays: -3,
        status: "completed",
        priority: "low",
      },
    ],
  },
  {
    contactName: "Tessa Wright",
    title: "Partnerships Manager",
    company: "Lumen Foods",
    industry: "Consumer Goods",
    website: "https://lumenfoods.example",
    email: `tessa.wright@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (615) 555-0191",
    status: "Contacted",
    source: "Referral",
    notes:
      "Partnerships team is evaluating better tracking for distributor intros and co-marketing opportunities.",
    dealName: "Distributor Partnership Pipeline",
    dealStage: "contacted",
    dealValue: 17600,
    probability: 30,
    expectedCloseOffsetDays: 24,
    createdOffsetDays: -7,
    noteEntries: [
      "Tessa wants to compare lead source reports with the current spreadsheet.",
    ],
    tasks: [
      {
        title: "Compare source report format",
        description: "Send a screenshot-ready source performance example.",
        dueOffsetDays: 7,
        status: "pending",
        priority: "medium",
      },
    ],
  },
  {
    contactName: "Henry Walsh",
    title: "CEO",
    company: "ForgeOps Consulting",
    industry: "Operations Consulting",
    website: "https://forgeopsconsulting.example",
    email: `henry.walsh@${DEMO_EMAIL_DOMAIN}`,
    phone: "+1 (602) 555-0129",
    status: "New",
    source: "Cold Email",
    notes:
      "CEO replied to outbound asking for examples of simple CRM workflows for boutique consulting teams.",
    dealName: "Consulting Sales Workspace",
    dealStage: "new",
    dealValue: 14300,
    probability: 22,
    expectedCloseOffsetDays: 31,
    createdOffsetDays: -3,
    noteEntries: ["Initial reply received. Needs qualification call."],
    tasks: [
      {
        title: "Qualify consulting workflow",
        description: "Ask about proposal volume, follow-up cadence, and owner model.",
        dueOffsetDays: 2,
        status: "pending",
        priority: "medium",
      },
    ],
  },
];

function requireEnv(name: "DATABASE_URL" | "CLERK_SECRET_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local or your shell environment.`);
  }

  return value;
}

function dayOffset(offset: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function findClerkUserId(email: string) {
  requireEnv("CLERK_SECRET_KEY");

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const users = await client.users.getUserList({
    emailAddress: [email],
    limit: 10,
  });
  const normalizedEmail = email.toLowerCase();
  const user = users.data.find((candidate) =>
    candidate.emailAddresses.some(
      (entry) => entry.emailAddress.toLowerCase() === normalizedEmail,
    ),
  );

  if (!user) {
    throw new Error(
      `No Clerk user found for ${email}. Sign in or create that Clerk user first, then rerun this seed.`,
    );
  }

  return user.id;
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const userId = await findClerkUserId(TARGET_EMAIL);
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const result = await db.transaction(async (tx) => {
      await tx
        .insert(workspaces)
        .values({
          ownerUserId: userId,
          name: DEMO_WORKSPACE_NAME,
        })
        .onConflictDoNothing({ target: [workspaces.ownerUserId, workspaces.name] });

      const [workspace] = await tx
        .select({
          id: workspaces.id,
          name: workspaces.name,
        })
        .from(workspaces)
        .where(
          and(
            eq(workspaces.ownerUserId, userId),
            eq(workspaces.name, DEMO_WORKSPACE_NAME),
          ),
        )
        .limit(1);

      if (!workspace) {
        throw new Error(`Unable to resolve workspace for Clerk user ${userId}.`);
      }

      const seedEmails = seedLeads.map((lead) => lead.email);
      const seedCompanies = seedLeads.map((lead) => lead.company);
      const seededLeadCondition = or(
        inArray(leads.email, seedEmails),
        inArray(leads.company, seedCompanies),
      );

      if (!seededLeadCondition) {
        throw new Error("Unable to build screenshot seed match condition.");
      }

      const [nonSeedLeadStats] = await tx
        .select({
          count: sql<number>`count(*)`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.workspaceId, workspace.id),
            eq(leads.userId, userId),
            not(seededLeadCondition),
          ),
        );
      const canRenameWorkspace = Number(nonSeedLeadStats?.count ?? 0) === 0;
      let workspaceName = workspace.name;

      if (workspace.name !== DEMO_WORKSPACE_NAME && canRenameWorkspace) {
        await tx
          .update(workspaces)
          .set({
            name: DEMO_WORKSPACE_NAME,
            updatedAt: new Date(),
          })
          .where(eq(workspaces.id, workspace.id));
        workspaceName = DEMO_WORKSPACE_NAME;
      }

      await tx
        .insert(workspaceMembers)
        .values({
          workspaceId: workspace.id,
          userId,
          role: "owner",
        })
        .onConflictDoNothing({
          target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        });

      const existingSeedLeads = await tx
        .select({
          id: leads.id,
          accountId: leads.accountId,
          contactId: leads.primaryContactId,
        })
        .from(leads)
        .where(
          and(
            eq(leads.workspaceId, workspace.id),
            eq(leads.userId, userId),
            seededLeadCondition,
          ),
        );
      const existingLeadIds = existingSeedLeads.map((lead) => lead.id);
      const existingAccountIds = existingSeedLeads
        .map((lead) => lead.accountId)
        .filter((id): id is string => Boolean(id));
      const existingContactIds = existingSeedLeads
        .map((lead) => lead.contactId)
        .filter((id): id is string => Boolean(id));

      if (existingLeadIds.length > 0) {
        await tx
          .delete(activityEvents)
          .where(
            and(
              eq(activityEvents.workspaceId, workspace.id),
              inArray(activityEvents.leadId, existingLeadIds),
            ),
          );
        await tx
          .delete(crmTasks)
          .where(
            and(eq(crmTasks.workspaceId, workspace.id), inArray(crmTasks.leadId, existingLeadIds)),
          );
        await tx
          .delete(leadNotes)
          .where(
            and(eq(leadNotes.workspaceId, workspace.id), inArray(leadNotes.leadId, existingLeadIds)),
          );
        await tx
          .delete(deals)
          .where(and(eq(deals.workspaceId, workspace.id), inArray(deals.leadId, existingLeadIds)));
        await tx
          .delete(leads)
          .where(and(eq(leads.workspaceId, workspace.id), inArray(leads.id, existingLeadIds)));
      }

      if (existingContactIds.length > 0) {
        await tx
          .delete(contacts)
          .where(and(eq(contacts.workspaceId, workspace.id), inArray(contacts.id, existingContactIds)));
      }

      if (existingAccountIds.length > 0) {
        await tx
          .delete(accounts)
          .where(and(eq(accounts.workspaceId, workspace.id), inArray(accounts.id, existingAccountIds)));
      }

      let createdTasks = 0;
      let createdNotes = 0;
      let createdEvents = 0;

      for (const seed of seedLeads) {
        const createdAt = dayOffset(seed.createdOffsetDays);
        const updatedAt =
          seed.dealStage === "won" || seed.dealStage === "lost"
            ? dayOffset(seed.closedOffsetDays ?? -1)
            : addHours(createdAt, 36);

        const [account] = await tx
          .insert(accounts)
          .values({
            workspaceId: workspace.id,
            userId,
            name: seed.company,
            website: seed.website,
            industry: seed.industry,
            createdAt,
            updatedAt,
          })
          .returning({ id: accounts.id });

        const [contact] = await tx
          .insert(contacts)
          .values({
            workspaceId: workspace.id,
            userId,
            accountId: account.id,
            fullName: seed.contactName,
            email: seed.email,
            phone: seed.phone,
            title: seed.title,
            createdAt,
            updatedAt,
          })
          .returning({ id: contacts.id });

        const [lead] = await tx
          .insert(leads)
          .values({
            workspaceId: workspace.id,
            userId,
            assignedOwnerUserId: userId,
            accountId: account.id,
            primaryContactId: contact.id,
            fullName: seed.contactName,
            company: seed.company,
            email: seed.email,
            phone: seed.phone,
            status: seed.status,
            source: seed.source,
            notes: seed.notes,
            createdAt,
            updatedAt,
          })
          .returning({ id: leads.id });

        const closedAt =
          seed.dealStage === "won" || seed.dealStage === "lost"
            ? dayOffset(seed.closedOffsetDays ?? -1)
            : null;
        const expectedCloseAt = seed.expectedCloseOffsetDays
          ? dayOffset(seed.expectedCloseOffsetDays)
          : null;

        const [deal] = await tx
          .insert(deals)
          .values({
            workspaceId: workspace.id,
            userId,
            ownerUserId: userId,
            leadId: lead.id,
            accountId: account.id,
            contactId: contact.id,
            name: seed.dealName,
            stage: seed.dealStage,
            valueCents: Math.round(seed.dealValue * 100),
            currency: "USD",
            probability: seed.probability,
            expectedCloseAt,
            closedAt,
            lostReason: seed.dealStage === "lost" ? seed.lostReason ?? null : null,
            createdAt,
            updatedAt,
          })
          .returning({ id: deals.id });

        await tx.insert(activityEvents).values({
          workspaceId: workspace.id,
          userId,
          eventType: "lead_created",
          message: `Lead created: ${seed.contactName}`,
          leadId: lead.id,
          leadName: seed.contactName,
          createdAt: addHours(createdAt, 2),
        });
        createdEvents += 1;

        if (seed.status !== "New") {
          const eventType: ActivityEventType =
            seed.status === "Interested" ? "lead_qualified" : "lead_status_changed";

          await tx.insert(activityEvents).values({
            workspaceId: workspace.id,
            userId,
            eventType,
            message:
              eventType === "lead_qualified"
                ? `Lead qualified: ${seed.contactName}`
                : `Lead status changed: ${seed.contactName} (${seed.status})`,
            leadId: lead.id,
            leadName: seed.contactName,
            createdAt: addHours(createdAt, 14),
          });
          createdEvents += 1;
        }

        await tx.insert(activityEvents).values({
          workspaceId: workspace.id,
          userId,
          eventType: "deal_stage_changed",
          message: `Opportunity updated: ${seed.dealName} (${seed.dealStage})`,
          leadId: lead.id,
          leadName: seed.contactName,
          createdAt: addHours(updatedAt, 1),
        });
        createdEvents += 1;

        for (const [index, content] of seed.noteEntries.entries()) {
          const noteCreatedAt = addHours(createdAt, 18 + index * 8);

          await tx.insert(leadNotes).values({
            workspaceId: workspace.id,
            userId,
            leadId: lead.id,
            content,
            createdAt: noteCreatedAt,
            updatedAt: noteCreatedAt,
          });
          createdNotes += 1;

          await tx.insert(activityEvents).values({
            workspaceId: workspace.id,
            userId,
            eventType: "lead_note_added",
            message: `Note added to ${seed.contactName}`,
            leadId: lead.id,
            leadName: seed.contactName,
            createdAt: addHours(noteCreatedAt, 1),
          });
          createdEvents += 1;
        }

        for (const task of seed.tasks) {
          const completedAt = task.status === "completed" ? dayOffset(-1) : null;
          const taskCreatedAt = addHours(createdAt, 28);

          await tx.insert(crmTasks).values({
            workspaceId: workspace.id,
            userId,
            ownerUserId: userId,
            leadId: lead.id,
            dealId: deal.id,
            contactId: contact.id,
            title: task.title,
            description: task.description,
            dueAt: dayOffset(task.dueOffsetDays),
            status: task.status,
            priority: task.priority,
            completedAt,
            createdAt: taskCreatedAt,
            updatedAt: completedAt ?? taskCreatedAt,
          });
          createdTasks += 1;

          await tx.insert(activityEvents).values({
            workspaceId: workspace.id,
            userId,
            eventType:
              task.status === "completed" ? "task_completed" : "task_created",
            message:
              task.status === "completed"
                ? `Task completed for ${seed.contactName}: ${task.title}`
                : `Task created for ${seed.contactName}: ${task.title}`,
            leadId: lead.id,
            leadName: seed.contactName,
            createdAt: completedAt ?? addHours(taskCreatedAt, 1),
          });
          createdEvents += 1;
        }
      }

      return {
        workspaceId: workspace.id,
        workspaceName,
        replacedLeads: existingLeadIds.length,
        createdLeads: seedLeads.length,
        createdNotes,
        createdTasks,
        createdEvents,
      };
    });

    console.log(`Seeded screenshot data for ${TARGET_EMAIL} (${userId}).`);
    console.log(`Workspace: ${result.workspaceName} (${result.workspaceId})`);
    console.log(`Replaced seeded leads: ${result.replacedLeads}`);
    console.log(`Created leads: ${result.createdLeads}`);
    console.log(`Created notes: ${result.createdNotes}`);
    console.log(`Created tasks: ${result.createdTasks}`);
    console.log(`Created activity events: ${result.createdEvents}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Screenshot seed failed: ${message}`);
  process.exitCode = 1;
});
