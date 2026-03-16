"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { createLeadAction } from "@/app/dashboard/leads/new/actions";
import { LEAD_STATUSES } from "@/lib/constants/leads";
import {
  createLeadSchema,
  type CreateLeadInput,
} from "@/lib/validations/lead";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const defaultValues: CreateLeadInput = {
  fullName: "",
  company: undefined,
  email: undefined,
  phone: undefined,
  status: "New",
  source: undefined,
  notes: undefined,
};

export function LeadForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit = (values: CreateLeadInput) => {
    startTransition(async () => {
      const result = await createLeadAction(values);

      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, errors] of Object.entries(result.fieldErrors)) {
            if (!errors?.length) continue;

            form.setError(field as keyof CreateLeadInput, {
              type: "server",
              message: errors[0],
            });
          }
        }

        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push(`/dashboard/leads/${result.leadId}`);
      router.refresh();
    });
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-semibold tracking-tight">
          Add a new lead
        </CardTitle>
        <CardDescription className="text-sm leading-6">
          Save a new contact to your pipeline with clean, structured details.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
          >
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
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The main contact name shown in tables and detail pages.
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
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
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
                        <SelectTrigger>
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
                      Set the current stage in your lead pipeline.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
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
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Useful for tracking where this lead came from.
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
                        placeholder="Add context, meeting notes, project details, or next steps..."
                        className="min-h-32 resize-y"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Keep any early context in one place for future follow-up.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Required fields are validated before saving.
              </p>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/leads")}
                  disabled={isPending}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving lead...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create lead
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