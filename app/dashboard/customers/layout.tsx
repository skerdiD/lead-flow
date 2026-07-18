import type { ReactNode } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { CustomersTabs } from "@/components/customers/customers-tabs";

export default function CustomersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          eyebrow="Relationship management"
          title="Customers"
          description="Manage the companies and people connected to your pipeline."
        />
        <CustomersTabs />
      </div>
      {children}
    </div>
  );
}
