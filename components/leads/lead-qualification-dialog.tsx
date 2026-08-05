"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Loader2,
  Search,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  qualifyLeadAction,
  searchQualificationEntitiesAction,
  type QualificationSearchResult,
} from "@/app/dashboard/leads/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEAL_CURRENCIES,
  DEAL_STAGE_LABELS,
  type DealCurrency,
} from "@/lib/constants/crm";
import { QUALIFICATION_DEAL_STAGES } from "@/lib/validations/lead-qualification";
import { cn } from "@/lib/utils";

export type LeadQualificationSnapshot = {
  id: string;
  fullName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  assignedOwnerUserId: string | null;
  ownerOptions: Array<{ userId: string; name: string }>;
};

const steps = ["Review", "Account", "Contact", "Deal", "Confirm"] as const;
const emptyResults: QualificationSearchResult = { accounts: [], contacts: [] };

function normalizePhone(value: string | null) {
  return value?.replace(/\D/g, "") || "";
}

export function LeadQualificationDialog({
  lead,
  disabled = false,
}: {
  lead: LeadQualificationSnapshot;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isSearching, startSearching] = useTransition();
  const [results, setResults] = useState(emptyResults);
  const [search, setSearch] = useState(lead.company ?? "");
  const [requestKey, setRequestKey] = useState("");

  const [accountMode, setAccountMode] = useState<"existing" | "new">(
    lead.company ? "new" : "existing",
  );
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState(lead.company ?? "");
  const [contactMode, setContactMode] = useState<"existing" | "new">("new");
  const [contactId, setContactId] = useState("");
  const [contactName, setContactName] = useState(lead.fullName);
  const [contactEmail, setContactEmail] = useState(lead.email ?? "");
  const [contactPhone, setContactPhone] = useState(lead.phone ?? "");
  const [contactTitle, setContactTitle] = useState(lead.jobTitle ?? "");
  const [acknowledgeDuplicate, setAcknowledgeDuplicate] = useState(false);
  const [serverWarning, setServerWarning] = useState<string | null>(null);
  const [dealName, setDealName] = useState(
    `${lead.company?.trim() || lead.fullName} opportunity`,
  );
  const [dealValue, setDealValue] = useState("0");
  const [dealCurrency, setDealCurrency] = useState<DealCurrency>("USD");
  const [dealStage, setDealStage] = useState<(typeof QUALIFICATION_DEAL_STAGES)[number]>("qualified");
  const [dealProbability, setDealProbability] = useState("50");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [ownerUserId, setOwnerUserId] = useState(
    lead.assignedOwnerUserId ?? lead.ownerOptions[0]?.userId ?? "",
  );

  useEffect(() => {
    if (!open || (step !== 1 && step !== 2)) return;
    const fallback =
      step === 1
        ? lead.company ?? ""
        : lead.email ?? lead.phone ?? lead.fullName;
    const term = search.trim() || fallback;
    const timeout = window.setTimeout(() => {
      startSearching(async () => {
        const response = await searchQualificationEntitiesAction(lead.id, term);
        if (response.success) setResults(response.data);
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [lead.company, lead.email, lead.fullName, lead.id, lead.phone, open, search, step]);

  const duplicateContacts = useMemo(() => {
    const email = contactEmail.trim().toLowerCase();
    const phone = normalizePhone(contactPhone);
    if (!email && !phone) return [];
    return results.contacts.filter(
      (contact) =>
        (email && contact.email?.trim().toLowerCase() === email) ||
        (phone && normalizePhone(contact.phone) === phone),
    );
  }, [contactEmail, contactPhone, results.contacts]);
  const duplicateAccount = results.accounts.find(
    (account) =>
      account.name.trim().toLowerCase() === accountName.trim().toLowerCase(),
  );

  const selectedAccount = results.accounts.find((account) => account.id === accountId);
  const selectedContact = results.contacts.find((contact) => contact.id === contactId);
  const selectedOwner = lead.ownerOptions.find((owner) => owner.userId === ownerUserId);

  const canContinue = (() => {
    if (step === 1) {
      return accountMode === "existing" ? Boolean(accountId) : accountName.trim().length >= 2;
    }
    if (step === 2) {
      return contactMode === "existing" ? Boolean(contactId) : contactName.trim().length >= 2;
    }
    if (step === 3) {
      return dealName.trim().length >= 2 && Boolean(ownerUserId) && Number(dealValue) >= 0;
    }
    return true;
  })();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setStep(0);
      setRequestKey(crypto.randomUUID());
      setServerWarning(null);
    }
  };

  const submit = () => {
    startSubmitting(async () => {
      const result = await qualifyLeadAction(lead.id, {
        requestKey,
        accountMode,
        accountId: accountMode === "existing" ? accountId : undefined,
        accountName: accountMode === "new" ? accountName : undefined,
        contactMode,
        contactId: contactMode === "existing" ? contactId : undefined,
        contactName: contactMode === "new" ? contactName : undefined,
        contactEmail: contactMode === "new" ? contactEmail : undefined,
        contactPhone: contactMode === "new" ? contactPhone : undefined,
        contactTitle: contactMode === "new" ? contactTitle : undefined,
        acknowledgeContactDuplicate: acknowledgeDuplicate,
        dealName,
        dealValue,
        dealCurrency,
        dealStage,
        dealProbability,
        expectedCloseDate,
        ownerUserId,
      });

      if (!result.success) {
        setServerWarning(result.message);
        if (result.code === "duplicate_account") setStep(1);
        if (result.code === "duplicate_contact") setStep(2);
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.push(`/dashboard/leads/${lead.id}#deal`);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Sparkles className="mr-2 h-4 w-4" />
          Qualify lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>Qualify {lead.fullName}</DialogTitle>
          <DialogDescription>
            Convert this prospect into a connected account, contact, and revenue opportunity.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto border-b px-4">
          <ol className="flex min-w-max" aria-label="Qualification progress">
            {steps.map((label, index) => (
              <li key={label} className="flex items-center">
                <span
                  className={cn(
                    "flex min-h-12 items-center gap-2 px-3 text-xs font-medium text-muted-foreground",
                    index === step && "text-foreground",
                  )}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[10px]", index < step && "border-primary bg-primary text-primary-foreground")}>
                    {index < step ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  {label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:min-h-[390px]">
          {serverWarning ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {serverWarning}
            </div>
          ) : null}

          {step === 0 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold">Review lead information</h3>
                <p className="mt-1 text-sm text-muted-foreground">This information will pre-fill the new CRM records.</p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Name", lead.fullName],
                  ["Company", lead.company || "Not provided"],
                  ["Email", lead.email || "Not provided"],
                  ["Phone", lead.phone || "Not provided"],
                  ["Job title", lead.jobTitle || "Not provided"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted/40 p-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold">Choose the account</h3>
                <p className="mt-1 text-sm text-muted-foreground">Use an existing workspace account or create one from the lead company.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={accountMode === "existing" ? "default" : "outline"} onClick={() => setAccountMode("existing")}>Select existing</Button>
                <Button type="button" variant={accountMode === "new" ? "default" : "outline"} onClick={() => setAccountMode("new")}>Create new</Button>
              </div>
              {accountMode === "existing" ? (
                <div className="space-y-3">
                  <Label htmlFor="qualification-account-search">Search accounts</Label>
                  <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="qualification-account-search" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by account name" /></div>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {isSearching ? <p className="text-sm text-muted-foreground">Searching…</p> : results.accounts.length ? results.accounts.map((account) => (
                      <button key={account.id} type="button" onClick={() => setAccountId(account.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left", accountId === account.id && "border-primary bg-primary/5")}>
                        <Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{account.name}</span>{accountId === account.id ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
                      </button>
                    )) : <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No matching accounts in this workspace.</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2"><Label htmlFor="qualification-account-name">Account name</Label><Input id="qualification-account-name" value={accountName} onChange={(event) => setAccountName(event.target.value)} /></div>
                  {duplicateAccount ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      <p><strong>Possible duplicate account.</strong> {duplicateAccount.name} already exists in this workspace.</p>
                      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => { setAccountId(duplicateAccount.id); setAccountMode("existing"); }}>
                        Use existing account
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div><h3 className="text-base font-semibold">Choose the contact</h3><p className="mt-1 text-sm text-muted-foreground">The contact will be attached to the selected account.</p></div>
              <div className="grid grid-cols-2 gap-2"><Button type="button" variant={contactMode === "existing" ? "default" : "outline"} onClick={() => setContactMode("existing")}>Select existing</Button><Button type="button" variant={contactMode === "new" ? "default" : "outline"} onClick={() => setContactMode("new")}>Create new</Button></div>
              {contactMode === "existing" ? (
                <div className="space-y-3"><Label htmlFor="qualification-contact-search">Search contacts</Label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="qualification-contact-search" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or phone" /></div><div className="max-h-48 space-y-2 overflow-y-auto">{isSearching ? <p className="text-sm text-muted-foreground">Searching…</p> : results.contacts.length ? results.contacts.map((contact) => <button key={contact.id} type="button" onClick={() => setContactId(contact.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left", contactId === contact.id && "border-primary bg-primary/5")}><UserRound className="h-4 w-4 text-muted-foreground" /><span><span className="block font-medium">{contact.fullName}</span><span className="block text-xs text-muted-foreground">{contact.email || contact.phone || contact.accountName || "No contact details"}</span></span>{contactId === contact.id ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}</button>) : <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No matching contacts in this workspace.</p>}</div></div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="qualification-contact-name">Full name</Label><Input id="qualification-contact-name" value={contactName} onChange={(event) => setContactName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="qualification-contact-email">Email</Label><Input id="qualification-contact-email" type="email" value={contactEmail} onChange={(event) => { setContactEmail(event.target.value); setAcknowledgeDuplicate(false); }} /></div><div className="space-y-2"><Label htmlFor="qualification-contact-phone">Phone</Label><Input id="qualification-contact-phone" value={contactPhone} onChange={(event) => { setContactPhone(event.target.value); setAcknowledgeDuplicate(false); }} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="qualification-contact-title">Job title</Label><Input id="qualification-contact-title" value={contactTitle} onChange={(event) => setContactTitle(event.target.value)} /></div></div>
              )}
              {contactMode === "new" && duplicateContacts.length ? <label className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" className="mt-1" checked={acknowledgeDuplicate} onChange={(event) => setAcknowledgeDuplicate(event.target.checked)} /><span><strong>Possible duplicate contact.</strong> {duplicateContacts.map((contact) => contact.fullName).join(", ")} has the same email or phone. Select the existing contact, or confirm this is a separate person.</span></label> : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div><h3 className="text-base font-semibold">Configure the deal</h3><p className="mt-1 text-sm text-muted-foreground">Create the revenue opportunity linked to this lead, account, and contact.</p></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="qualification-deal-name">Deal title</Label><Input id="qualification-deal-name" value={dealName} onChange={(event) => setDealName(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="qualification-deal-value">Value</Label><Input id="qualification-deal-value" type="number" min="0" step="0.01" value={dealValue} onChange={(event) => setDealValue(event.target.value)} /></div><div className="space-y-2"><Label>Currency</Label><Select value={dealCurrency} onValueChange={(value) => setDealCurrency(value as DealCurrency)}><SelectTrigger aria-label="Deal currency"><SelectValue /></SelectTrigger><SelectContent>{DEAL_CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Stage</Label><Select value={dealStage} onValueChange={(value) => setDealStage(value as typeof dealStage)}><SelectTrigger aria-label="Qualification deal stage"><SelectValue /></SelectTrigger><SelectContent>{QUALIFICATION_DEAL_STAGES.map((stage) => <SelectItem key={stage} value={stage}>{DEAL_STAGE_LABELS[stage]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="qualification-deal-probability">Probability (%)</Label><Input id="qualification-deal-probability" type="number" min="0" max="100" value={dealProbability} onChange={(event) => setDealProbability(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="qualification-close-date">Expected close date</Label><Input id="qualification-close-date" type="date" value={expectedCloseDate} onChange={(event) => setExpectedCloseDate(event.target.value)} /></div><div className="space-y-2"><Label>Owner</Label><Select value={ownerUserId} onValueChange={setOwnerUserId}><SelectTrigger aria-label="Deal owner"><SelectValue placeholder="Select owner" /></SelectTrigger><SelectContent>{lead.ownerOptions.map((owner) => <SelectItem key={owner.userId} value={owner.userId}>{owner.name}</SelectItem>)}</SelectContent></Select></div></div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5"><div><h3 className="text-base font-semibold">Confirm qualification</h3><p className="mt-1 text-sm text-muted-foreground">All records will be created and connected in one transaction.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/40 p-4"><Building2 className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Account</p><p className="mt-1 font-medium">{accountMode === "new" ? accountName : selectedAccount?.name || "Selected account"}</p><p className="text-xs text-muted-foreground">{accountMode === "new" ? "Create new" : "Use existing"}</p></div><div className="rounded-xl bg-muted/40 p-4"><UserRound className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Contact</p><p className="mt-1 font-medium">{contactMode === "new" ? contactName : selectedContact?.fullName || "Selected contact"}</p><p className="text-xs text-muted-foreground">{contactMode === "new" ? "Create new" : "Use existing"}</p></div><div className="rounded-xl bg-muted/40 p-4"><Target className="h-5 w-5 text-muted-foreground" /><p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">Deal</p><p className="mt-1 font-medium">{dealName}</p><p className="text-xs text-muted-foreground">{dealCurrency} {Number(dealValue || 0).toLocaleString()} · {selectedOwner?.name || "Owner"}</p></div></div><p className="rounded-xl border bg-background p-4 text-sm leading-6 text-muted-foreground">The original lead remains in the CRM and will be marked Interested with links to the account, contact, and deal.</p></div>
          ) : null}
        </div>

        <DialogFooter className="m-0 px-5 py-4">
          {step > 0 ? <Button type="button" variant="outline" onClick={() => { setServerWarning(null); setStep((current) => current - 1); }} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button> : null}
          {step < steps.length - 1 ? <Button type="button" onClick={() => { setServerWarning(null); if (step === 1) setSearch(lead.email ?? lead.phone ?? lead.fullName); setStep((current) => current + 1); }} disabled={!canContinue}>Continue<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" onClick={submit} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Confirm qualification</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
