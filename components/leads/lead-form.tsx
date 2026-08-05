"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import {
  createLeadAction,
  updateLeadAction,
} from "@/app/dashboard/leads/actions";
import {
  DEAL_CURRENCIES,
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
} from "@/lib/constants/crm";
import {
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_PRIORITY_LABELS,
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_STATUS_LABELS,
  LEAD_STATUSES,
} from "@/lib/constants/leads";
import {
  leadFormSchema,
  type LeadFormValues,
} from "@/lib/validations/lead";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type LeadFormProps = {
  mode: "create" | "edit";
  leadId?: string;
  initialValues?: Partial<LeadFormValues>;
  showOpportunity?: boolean;
};

const defaultValues: LeadFormValues = {
  fullName: "",
  company: undefined,
  email: undefined,
  phone: undefined,
  status: "New",
  source: undefined,
  notes: undefined,
  nextFollowUpDate: undefined,
  followUpNote: undefined,
  followUpPriority: "medium",
  followUpStatus: "pending",
  dealName: undefined,
  dealStage: "new",
  dealValue: 0,
  dealCurrency: "USD",
  dealProbability: 10,
  expectedCloseDate: undefined,
  closedDate: undefined,
  lostReason: undefined,
};

export function LeadForm({
  mode,
  leadId,
  initialValues,
  showOpportunity = false,
}: LeadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema) as never,
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
    mode: "onBlur",
  });

  const onSubmit = (values: LeadFormValues) => {
    startTransition(async () => {
      const result =
        mode === "edit" && leadId
          ? await updateLeadAction(leadId, values)
          : await createLeadAction(values);

      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, errors] of Object.entries(result.fieldErrors)) {
            if (!errors?.length) continue;

            form.setError(field as keyof LeadFormValues, {
              type: "server",
              message: errors[0],
            });
          }
        }

        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push(
        mode === "create"
          ? "/dashboard/leads"
          : `/dashboard/leads/${result.leadId}`,
      );
      router.refresh();
    });
  };

  return (
    <Card className="border-border/60 shadow-sm" data-testid={mode === "edit" ? "edit-lead-form" : "create-lead-form"}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold tracking-tight">
          {mode === "edit" ? "Edit lead" : "Add a new lead"}
        </CardTitle>
        <CardDescription className="text-sm leading-6">
          {mode === "edit"
            ? "Update the latest details, status, and context for this lead."
            : "Save a new lead with clean, structured information for your pipeline."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <section className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lead basics
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Carter"
                          autoComplete="name"
                          disabled={isPending}
                          data-testid="lead-full-name-input"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This is the primary contact name shown across the app.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Studio"
                          autoComplete="organization"
                          disabled={isPending}
                          data-testid="lead-company-input"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional, but useful for search and context.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="lead-status-select">
                            <SelectValue placeholder="Select lead status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the current stage in your pipeline.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact details
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@acmestudio.com"
                          autoComplete="email"
                          disabled={isPending}
                          data-testid="lead-email-input"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Used in search and future follow-up workflows.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+355 69 123 4567"
                          autoComplete="tel"
                          disabled={isPending}
                          data-testid="lead-phone-input"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional phone number for direct outreach.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Context
              </p>

              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Referral, LinkedIn, Website, Upwork..."
                          disabled={isPending}
                          data-testid="lead-source-input"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Helps you understand where the lead came from.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add project context, meeting notes, budget hints, or next steps..."
                          className="min-h-32 resize-y"
                          disabled={isPending}
                          data-testid="lead-notes-input-field"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Keep helpful context here so future follow-up stays easy.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Follow-up reminder
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nextFollowUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next follow-up date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isPending}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Shows as due today, overdue, or upcoming in the leads table.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUpPriority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FOLLOW_UP_PRIORITIES.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {FOLLOW_UP_PRIORITY_LABELS[priority]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Helps you spot the most important next touches.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUpStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FOLLOW_UP_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {FOLLOW_UP_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Mark reminders completed or rescheduled as work moves.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="followUpNote"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Follow-up note</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What should happen on the next touch?"
                          className="min-h-24 resize-y"
                          disabled={isPending}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Keep the next action focused and easy to act on.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {showOpportunity ? (
            <section id="opportunity" className="scroll-mt-6 rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Opportunity
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dealName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Website redesign package"
                          disabled={isPending}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional opportunity linked to this lead.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dealStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal stage</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select deal stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEAL_STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {DEAL_STAGE_LABELS[stage]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Tracks the sales pipeline after qualification.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dealValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal value</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="5000"
                          disabled={isPending}
                          value={field.value ?? 0}
                          onChange={(event) => field.onChange(event.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Estimated contract value for forecasting.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dealCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEAL_CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Used for dashboard revenue display.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dealProbability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder="40"
                          disabled={isPending}
                          value={field.value ?? 0}
                          onChange={(event) => field.onChange(event.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Percent chance used for weighted forecast.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedCloseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected close date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isPending}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Used for this month forecast metrics.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closed date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isPending}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional date for won or lost deals.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lostReason"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Lost reason</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Budget, timing, no decision..."
                          disabled={isPending}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional context when a deal is marked lost.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
            ) : null}

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {mode === "edit"
                  ? "Changes update the lead immediately after save."
                  : "You can edit any field later from the lead details page."}
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  data-testid="lead-form-cancel-btn"
                  onClick={() =>
                    router.push(
                      mode === "edit" && leadId
                        ? `/dashboard/leads/${leadId}`
                        : "/dashboard/leads",
                    )
                  }
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isPending} data-testid="lead-form-submit-btn">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "edit" ? "Saving changes..." : "Creating lead..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {mode === "edit" ? "Save changes" : "Create lead"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
