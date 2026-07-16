"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createContactAction, updateContactAction } from "@/app/dashboard/crm-actions";
import type { ContactFormValues } from "@/lib/validations/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };
export function ContactForm({ id, initialValues, accounts }: { id?: string; initialValues?: Partial<ContactFormValues>; accounts: Option[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  return <form className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6" action={(data) => startTransition(async () => { const values = Object.fromEntries(data); const normalized = { ...values, accountId: values.accountId === "none" ? undefined : values.accountId, isPrimary: data.get("isPrimary") === "on" } as ContactFormValues; const result = id ? await updateContactAction(id, normalized) : await createContactAction(normalized); if (!result.success) { toast.error(result.message); return; } toast.success(result.message); router.push(`/dashboard/contacts/${result.id}`); router.refresh(); })}>
    <div className="grid gap-5 md:grid-cols-2"><div><Label htmlFor="fullName">Full name *</Label><Input id="fullName" name="fullName" required minLength={2} defaultValue={initialValues?.fullName ?? ""} className="mt-2" /></div><div><Label htmlFor="title">Role or job title</Label><Input id="title" name="title" defaultValue={initialValues?.title ?? ""} className="mt-2" placeholder="Marketing director" /></div><div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={initialValues?.email ?? ""} className="mt-2" /></div><div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" defaultValue={initialValues?.phone ?? ""} className="mt-2" /></div><div className="md:col-span-2"><Label>Account</Label><Select name="accountId" defaultValue={initialValues?.accountId ?? "none"}><SelectTrigger className="mt-2"><SelectValue placeholder="No linked account" /></SelectTrigger><SelectContent><SelectItem value="none">No linked account</SelectItem>{accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.label}</SelectItem>)}</SelectContent></Select></div><label className="flex items-center gap-2 text-sm font-medium"><input name="isPrimary" type="checkbox" defaultChecked={initialValues?.isPrimary} className="size-4 rounded border" /> Primary contact for this account</label></div>
    <div className="mt-6 flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={pending} onClick={() => router.back()}>Cancel</Button><Button disabled={pending}>{pending ? "Saving…" : id ? "Save changes" : "Create contact"}</Button></div>
  </form>;
}
