import { redirect } from "next/navigation";

type LeadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LeadPage({ params }: LeadPageProps) {
  const { id } = await params;
  redirect(`/dashboard/leads/${id}/edit`);
}

