import { createClerkClient } from "@clerk/backend";
import { and, eq, sql } from "drizzle-orm";
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
  notifications,
  workspaceMembers,
  workspaces,
  type activityEventTypes,
  type dealStages,
  type followUpPriorities,
  type followUpStatuses,
  type leadStatuses,
  type taskPriorities,
  type taskStatuses,
} from "@/db/schema";
import {
  DEMO_WORKSPACE_NAME,
} from "@/lib/demo";
import { getDemoUserConfigs, type DemoUserConfig } from "@/lib/demo-config.server";
import { DEAL_STAGE_LABELS } from "@/lib/constants/crm";

type LeadStatus = (typeof leadStatuses)[number];
type DealStage = (typeof dealStages)[number];
type FollowUpPriority = (typeof followUpPriorities)[number];
type FollowUpStatus = (typeof followUpStatuses)[number];
type TaskStatus = (typeof taskStatuses)[number];
type TaskPriority = (typeof taskPriorities)[number];
type ActivityEventType = (typeof activityEventTypes)[number];

type SeedLead = {
  contactName: string;
  title: string;
  company: string;
  industry: string;
  website: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: "Website" | "LinkedIn" | "Upwork" | "Cold Email" | "Referral";
  notes: string;
  followUpDateOffsetDays?: number;
  followUpNote?: string;
  followUpPriority: FollowUpPriority;
  followUpStatus: FollowUpStatus;
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

const DEMO_EMAIL_DOMAIN = "leadflow-demo.example";
const demoDb = drizzle(
  new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  {
    schema: {
      accounts,
      activityEvents,
      contacts,
      crmTasks,
      deals,
      leadNotes,
      leads,
      notifications,
      workspaceMembers,
      workspaces,
    },
  },
);

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
      "Evaluating a CRM rollout for three regional sales teams. Strong executive sponsor and a clear budget window.",
    followUpDateOffsetDays: 2,
    followUpNote:
      "Send the phased onboarding plan with rollout milestones and first-month success metrics.",
    followUpPriority: "high",
    followUpStatus: "pending",
    dealName: "Regional CRM Rollout",
    dealStage: "proposal",
    dealValue: 48000,
    probability: 72,
    expectedCloseOffsetDays: 12,
    createdOffsetDays: -24,
    noteEntries: [
      "Proposal reviewed with operations and finance. Ava asked for a phased onboarding option.",
      "Security checklist received. No blockers identified for the CRM data model.",
    ],
    tasks: [
      {
        title: "Send phased onboarding plan",
        description: "Include milestones, first-month KPIs, and launch responsibilities.",
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
      "Founder-led agency needed a lighter pipeline workflow for inbound retainers. Closed after a product walkthrough.",
    followUpDateOffsetDays: 5,
    followUpNote: "Prep kickoff agenda and confirm the import format before onboarding.",
    followUpPriority: "medium",
    followUpStatus: "rescheduled",
    dealName: "Agency Pipeline Workspace",
    dealStage: "won",
    dealValue: 18500,
    probability: 100,
    closedOffsetDays: -5,
    createdOffsetDays: -21,
    noteEntries: [
      "Contract signed for the annual plan. First workspace review scheduled with the account lead.",
      "Julian liked activity tracking and PDF exports for client reporting.",
    ],
    tasks: [
      {
        title: "Schedule kickoff call",
        description: "Confirm users, import format, and dashboard goals.",
        dueOffsetDays: 5,
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
    followUpDateOffsetDays: 0,
    followUpNote:
      "Share a sample CSV export and align on the reporting fields RevOps wants to see.",
    followUpPriority: "high",
    followUpStatus: "pending",
    dealName: "Growth Pipeline Consolidation",
    dealStage: "qualified",
    dealValue: 36500,
    probability: 58,
    expectedCloseOffsetDays: 21,
    createdOffsetDays: -18,
    noteEntries: [
      "Discovery call confirmed a need for source reporting and weighted forecast visibility.",
      "Maya wants a sample CSV export before involving RevOps.",
    ],
    tasks: [
      {
        title: "Share sample import template",
        description: "Include sources, deal value, probability, and notes columns.",
        dueOffsetDays: 0,
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
      "Outbound reply from the sales director. Team is replacing a spreadsheet-heavy renewal tracker.",
    followUpDateOffsetDays: 3,
    followUpNote: "Lock a discovery workshop focused on renewal handoffs and dashboard visibility.",
    followUpPriority: "medium",
    followUpStatus: "pending",
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
        description: "Focus on renewal handoffs and reporting cadence.",
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
    source: "Referral",
    notes:
      "Referral-led opportunity. The firm needs visibility into consultation requests, follow-ups, and signed matters.",
    followUpDateOffsetDays: -1,
    followUpNote: "Follow up on proposal questions about user count, import timing, and reporting cadence.",
    followUpPriority: "high",
    followUpStatus: "pending",
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
        description: "Clarify rollout timing, reporting cadence, and stakeholder access.",
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
      "Strong fit, but procurement chose to extend the current contract for another quarter.",
    followUpDateOffsetDays: 45,
    followUpNote: "Reconnect next quarter with a revised business case before renewal planning begins.",
    followUpPriority: "low",
    followUpStatus: "rescheduled",
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
        description: "Send a revised business case before renewal planning.",
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
    followUpDateOffsetDays: 5,
    followUpNote: "Send education workflow examples that map inquiry, visit, and application stages.",
    followUpPriority: "medium",
    followUpStatus: "pending",
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
        description: "Show inquiry, visit, application, and enrollment stages.",
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
    followUpDateOffsetDays: 1,
    followUpNote: "Qualify the estimate workflow and current follow-up process.",
    followUpPriority: "medium",
    followUpStatus: "pending",
    dealName: "Residential Estimate Tracker",
    dealStage: "new",
    dealValue: 12800,
    probability: 18,
    expectedCloseOffsetDays: 40,
    createdOffsetDays: -2,
    noteEntries: [
      "Lead imported from the Upwork conversation summary.",
    ],
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
    followUpDateOffsetDays: 6,
    followUpNote: "Run a short demo focused on source filters and the workspace timeline.",
    followUpPriority: "medium",
    followUpStatus: "pending",
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
        description: "Show lead filters, activity history, and follow-up visibility.",
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
    source: "Referral",
    notes:
      "RevOps team selected LeadFlow for a lightweight pilot with high-value retail partners.",
    followUpDateOffsetDays: 2,
    followUpNote: "Prepare the pilot kickoff checklist and confirm success criteria.",
    followUpPriority: "high",
    followUpStatus: "pending",
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
    followUpDateOffsetDays: 1,
    followUpNote: "Reply with discovery times and ask about current lead volume.",
    followUpPriority: "high",
    followUpStatus: "pending",
    dealName: "Patient Consultation Tracker",
    dealStage: "new",
    dealValue: 9600,
    probability: 20,
    expectedCloseOffsetDays: 29,
    createdOffsetDays: -1,
    noteEntries: [
      "Auto-captured from the website contact form.",
    ],
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
    followUpDateOffsetDays: -2,
    followUpNote: "Resend the ROI summary and ask for stakeholder feedback from the operations lead.",
    followUpPriority: "medium",
    followUpStatus: "pending",
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
      {
        title: "Follow up on ROI feedback",
        description: "Check whether the operations lead has reviewed the summary yet.",
        dueOffsetDays: 0,
        status: "pending",
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
    followUpDateOffsetDays: 2,
    followUpNote: "Send a PDF export example with a leadership-ready revenue forecast view.",
    followUpPriority: "medium",
    followUpStatus: "pending",
    dealName: "Expansion Pipeline Workspace",
    dealStage: "proposal",
    dealValue: 26800,
    probability: 64,
    expectedCloseOffsetDays: 9,
    createdOffsetDays: -22,
    noteEntries: [
      "Proposal sent after a workflow review. Elena asked about exporting leadership-ready reports.",
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
];

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing CLERK_SECRET_KEY.");
  }

  return createClerkClient({ secretKey });
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

async function findDemoUserId(config: DemoUserConfig) {
  const client = getClerkClient();
  const [byExternalId, byEmail] = await Promise.all([
    client.users.getUserList({
      externalId: [config.externalId],
      limit: 1,
    }),
    client.users.getUserList({
      emailAddress: [config.email],
      limit: 1,
    }),
  ]);

  if (
    byExternalId.data[0] &&
    byEmail.data[0] &&
    byExternalId.data[0].id !== byEmail.data[0].id
  ) {
    throw new Error(`Demo ${config.role} identity does not resolve consistently.`);
  }

  return byExternalId.data[0]?.id ?? byEmail.data[0]?.id ?? null;
}

async function ensureDemoUser(
  config: DemoUserConfig,
  firstName: string,
  lastName: string,
) {
  const client = getClerkClient();
  const existingUserId = await findDemoUserId(config);

  if (existingUserId) {
    await client.users.updateUser(existingUserId, {
      externalId: config.externalId,
      firstName,
      lastName,
      skipLegalChecks: true,
      deleteSelfEnabled: false,
      createOrganizationEnabled: false,
    });

    return existingUserId;
  }

  const createdUser = await client.users.createUser({
    externalId: config.externalId,
    emailAddress: [config.email],
    firstName,
    lastName,
    skipPasswordRequirement: true,
    skipLegalChecks: true,
  });

  return createdUser.id;
}

async function ensureDemoCollaborator(params: DemoUserConfig & {
  firstName: string;
  lastName: string;
}) {
  const client = getClerkClient();
  const existing = await client.users.getUserList({
    externalId: [params.externalId],
    limit: 1,
  });
  const existingUser = existing.data[0];

  if (existingUser) {
    await client.users.updateUser(existingUser.id, {
      firstName: params.firstName,
      lastName: params.lastName,
      skipLegalChecks: true,
      deleteSelfEnabled: false,
      createOrganizationEnabled: false,
    });
    return existingUser.id;
  }

  return (
    await client.users.createUser({
      externalId: params.externalId,
      emailAddress: [params.email],
      firstName: params.firstName,
      lastName: params.lastName,
      skipPasswordRequirement: true,
      skipLegalChecks: true,
    })
  ).id;
}

async function getWorkspaceSeedHealth(workspaceId: string) {
  const [[leadStats], [taskStats], [activityStats], [notificationStats]] =
    await Promise.all([
    demoDb
      .select({
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .where(eq(leads.workspaceId, workspaceId)),
    demoDb
      .select({
        count: sql<number>`count(*)`,
      })
      .from(crmTasks)
      .where(eq(crmTasks.workspaceId, workspaceId)),
    demoDb
      .select({
        count: sql<number>`count(*)`,
      })
      .from(activityEvents)
      .where(eq(activityEvents.workspaceId, workspaceId)),
    demoDb
      .select({
        count: sql<number>`count(*)`,
      })
      .from(notifications)
      .where(eq(notifications.workspaceId, workspaceId)),
  ]);

  return {
    leadCount: Number(leadStats?.count ?? 0),
    taskCount: Number(taskStats?.count ?? 0),
    activityCount: Number(activityStats?.count ?? 0),
    notificationCount: Number(notificationStats?.count ?? 0),
  };
}

async function clearWorkspaceData(workspaceId: string) {
  await demoDb.transaction(async (tx) => {
    await tx.delete(notifications).where(eq(notifications.workspaceId, workspaceId));
    await tx.delete(leadNotes).where(eq(leadNotes.workspaceId, workspaceId));
    await tx.delete(activityEvents).where(eq(activityEvents.workspaceId, workspaceId));
    await tx.delete(crmTasks).where(eq(crmTasks.workspaceId, workspaceId));
    await tx.delete(deals).where(eq(deals.workspaceId, workspaceId));
    await tx.delete(leads).where(eq(leads.workspaceId, workspaceId));
    await tx.delete(contacts).where(eq(contacts.workspaceId, workspaceId));
    await tx.delete(accounts).where(eq(accounts.workspaceId, workspaceId));
  });
}

async function seedWorkspaceData(workspaceId: string, userId: string) {
  await demoDb.transaction(async (tx) => {
    let createdNotifications = 0;

    for (const seed of seedLeads) {
      const createdAt = dayOffset(seed.createdOffsetDays);
      const closedAt =
        seed.dealStage === "won" || seed.dealStage === "lost"
          ? dayOffset(seed.closedOffsetDays ?? -1)
          : null;
      const updatedAt = closedAt ?? addHours(createdAt, 36);
      const expectedCloseAt = seed.expectedCloseOffsetDays
        ? dayOffset(seed.expectedCloseOffsetDays)
        : null;
      const nextFollowUpDate =
        typeof seed.followUpDateOffsetDays === "number"
          ? dayOffset(seed.followUpDateOffsetDays)
          : null;

      const [account] = await tx
        .insert(accounts)
        .values({
          workspaceId,
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
          workspaceId,
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
          workspaceId,
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
          nextFollowUpDate,
          followUpNote: seed.followUpNote ?? null,
          followUpPriority: seed.followUpPriority,
          followUpStatus: seed.followUpStatus,
          createdAt,
          updatedAt,
        })
        .returning({ id: leads.id });

      const [deal] = await tx
        .insert(deals)
        .values({
          workspaceId,
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

      const baseEvents: Array<{
        eventType: ActivityEventType;
        message: string;
        createdAt: Date;
      }> = [
        {
          eventType: "lead_created",
          message: `Lead created: ${seed.contactName}`,
          createdAt: addHours(createdAt, 2),
        },
      ];

      if (seed.status !== "New") {
        baseEvents.push({
          eventType:
            seed.status === "Interested" ? "lead_qualified" : "lead_status_changed",
          message:
            seed.status === "Interested"
              ? `Lead qualified: ${seed.contactName}`
              : `Lead status changed: ${seed.contactName} (${seed.status})`,
          createdAt: addHours(createdAt, 14),
        });
      }

      if (nextFollowUpDate) {
        baseEvents.push({
          eventType: "lead_updated",
          message: `Follow-up scheduled for ${seed.contactName}`,
          createdAt: addHours(createdAt, 18),
        });
      }

      baseEvents.push({
        eventType: "deal_stage_changed",
        message: `Opportunity updated: ${seed.dealName} (${seed.dealStage})`,
        createdAt: addHours(updatedAt, 1),
      });

      for (const event of baseEvents) {
        await tx.insert(activityEvents).values({
          workspaceId,
          userId,
          eventType: event.eventType,
          message: event.message,
          leadId: lead.id,
          leadName: seed.contactName,
          createdAt: event.createdAt,
        });
      }

      if (seed.dealStage === "proposal" && createdNotifications < 3) {
        await tx.insert(notifications).values({
          workspaceId,
          userId,
          type: "deal_stage_changed",
          title: "Deal stage updated",
          message: `${seed.dealName} moved to ${DEAL_STAGE_LABELS[seed.dealStage]}.`,
          actionUrl: `/dashboard/leads/${lead.id}#lead-deal`,
          metadata: { entityType: "deal", entityId: deal.id },
          dedupeKey: `seed:deal-stage:${deal.id}:proposal`,
          readAt: addHours(updatedAt, 3),
          createdAt: addHours(updatedAt, 2),
        });
        createdNotifications += 1;
      }

      for (const [index, content] of seed.noteEntries.entries()) {
        const noteCreatedAt = addHours(createdAt, 20 + index * 8);

        await tx.insert(leadNotes).values({
          workspaceId,
          userId,
          leadId: lead.id,
          content,
          createdAt: noteCreatedAt,
          updatedAt: noteCreatedAt,
        });

        await tx.insert(activityEvents).values({
          workspaceId,
          userId,
          eventType: "lead_note_added",
          message: `Note added to ${seed.contactName}`,
          leadId: lead.id,
          leadName: seed.contactName,
          createdAt: addHours(noteCreatedAt, 1),
        });
      }

      for (const task of seed.tasks) {
        const taskCreatedAt = addHours(createdAt, 28);
        const completedAt =
          task.status === "completed" ? addHours(dayOffset(task.dueOffsetDays), 8) : null;

        const [createdTask] = await tx
          .insert(crmTasks)
          .values({
            workspaceId,
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
          })
          .returning({ id: crmTasks.id });

        await tx.insert(activityEvents).values({
          workspaceId,
          userId,
          eventType: task.status === "completed" ? "task_completed" : "task_created",
          message:
            task.status === "completed"
              ? `Task completed for ${seed.contactName}: ${task.title}`
              : `Task created for ${seed.contactName}: ${task.title}`,
          leadId: lead.id,
          leadName: seed.contactName,
          createdAt: completedAt ?? addHours(taskCreatedAt, 1),
        });

        const notificationType =
          task.status === "pending" && task.dueOffsetDays < 0
            ? "task_overdue"
            : task.status === "pending" && task.dueOffsetDays === 0
              ? "task_due"
              : null;

        if (createdTask && notificationType && createdNotifications < 3) {
          await tx.insert(notifications).values({
            workspaceId,
            userId,
            type: notificationType,
            title:
              notificationType === "task_overdue"
                ? "Task overdue"
                : "Task due today",
            message:
              notificationType === "task_overdue"
                ? `${task.title} is past its due date.`
                : `${task.title} is due today.`,
            actionUrl: `/dashboard/leads/${lead.id}#lead-tasks`,
            metadata: { entityType: "task", entityId: createdTask.id },
            dedupeKey: `seed:${notificationType}:${createdTask.id}`,
            createdAt:
              notificationType === "task_overdue"
                ? addHours(dayOffset(-1), 9)
                : addHours(dayOffset(0), 8),
          });
          createdNotifications += 1;
        }
      }
    }
  });
}

export async function ensureDemoWorkspaceSeeded(options?: { forceReset?: boolean }) {
  const forceReset = options?.forceReset ?? false;
  const demoUsers = getDemoUserConfigs();
  const userId = await ensureDemoUser(demoUsers.owner, "LeadFlow", "Demo");
  const [adminUserId, memberUserId] = await Promise.all([
    ensureDemoCollaborator({
      ...demoUsers.admin,
      firstName: "Demo",
      lastName: "Admin",
    }),
    ensureDemoCollaborator({
      ...demoUsers.member,
      firstName: "Demo",
      lastName: "Member",
    }),
  ]);

  const workspace = await demoDb.transaction(async (tx) => {
    await tx
      .insert(workspaces)
      .values({
        ownerUserId: userId,
        name: DEMO_WORKSPACE_NAME,
      })
      .onConflictDoNothing({ target: [workspaces.ownerUserId, workspaces.name] });

    const [resolvedWorkspace] = await tx
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

    if (!resolvedWorkspace) {
      throw new Error("Unable to resolve the LeadFlow demo workspace.");
    }

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: resolvedWorkspace.id,
        userId,
        role: "owner",
      })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role: "owner" },
      });

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: resolvedWorkspace.id,
        userId: adminUserId,
        role: "admin",
      })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role: "admin" },
      });

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: resolvedWorkspace.id,
        userId: memberUserId,
        role: "member",
      })
      .onConflictDoUpdate({
        target: [workspaceMembers.workspaceId, workspaceMembers.userId],
        set: { role: "member" },
      });

    return resolvedWorkspace;
  });

  const health = await getWorkspaceSeedHealth(workspace.id);
  const needsSeed =
    forceReset ||
    health.leadCount < seedLeads.length ||
    health.taskCount === 0 ||
    health.activityCount === 0 ||
    health.notificationCount < 3;

  if (needsSeed) {
    await clearWorkspaceData(workspace.id);
    await seedWorkspaceData(workspace.id, userId);
  }

  return {
    userId,
    adminUserId,
    memberUserId,
    workspaceId: workspace.id,
    workspaceName: DEMO_WORKSPACE_NAME,
    seeded: needsSeed,
  };
}
