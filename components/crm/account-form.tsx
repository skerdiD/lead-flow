"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAccountAction, updateAccountAction } from "@/app/dashboard/crm-actions";
import type { AccountFormValues } from "@/lib/validations/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountForm({ id, initialValues }: { id?: string; initialValues?: Partial<AccountFormValues> }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  return <form className="rounded-3xl border bg-background p-5 shadow-sm sm:p-6" action={(formData) => startTransition(async () => { const result = id ? await updateAccountAction(id, Object.fromEntries(formData) as AccountFormValues) : await createAccountAction(Object.fromEntries(formData) as AccountFormValues); if (!result.success) { toast.error(result.message); return; } toast.success(result.message); router.push(`/dashboard/customers/accounts/${result.id}`); router.refresh(); })}>
    <div className="grid gap-5 md:grid-cols-2"><div className="md:col-span-2"><Label htmlFor="name">Account name *</Label><Input id="name" name="name" required minLength={2} defaultValue={initialValues?.name ?? ""} className="mt-2" placeholder="Acme Studio" /></div><div><Label htmlFor="industry">Industry</Label><Input id="industry" name="industry" defaultValue={initialValues?.industry ?? ""} className="mt-2" placeholder="Design and technology" /></div><div><Label htmlFor="website">Website</Label><Input id="website" name="website" type="url" defaultValue={initialValues?.website ?? ""} className="mt-2" placeholder="https://acme.com" /></div></div>
    <div className="mt-6 flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" disabled={pending} onClick={() => router.back()}>Cancel</Button><Button disabled={pending}>{pending ? "Saving…" : id ? "Save changes" : "Create account"}</Button></div>
  </form>;
}
