import { requireUserId } from "@/lib/auth";
import { findOwnedLeadById } from "@/lib/leads";

export async function getLeadDetails(leadId: string) {
  const normalizedLeadId = leadId.trim();

  if (!normalizedLeadId) {
    return null;
  }

  const userId = await requireUserId();
  const lead = await findOwnedLeadById(userId, normalizedLeadId);

  if (!lead) {
    return null;
  }

  return {
    id: lead.id,
    fullName: lead.fullName,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    source: lead.source,
    notes: lead.notes,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}