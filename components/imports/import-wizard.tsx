"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMPORT_ENTITY_DETAILS,
  IMPORT_FIELDS,
  IMPORT_LIMITS,
  type DuplicateStrategy,
  type ImportEntityType,
} from "@/lib/imports/config";
import { cn } from "@/lib/utils";

type DraftResponse = {
  id: string;
  entityType: ImportEntityType;
  fileName: string;
  headers: string[];
  samples: Array<{ header: string; values: string[] }>;
  suggestedMapping: Record<string, string | null>;
  totalRows: number;
};

type ImportDetails = {
  job: {
    id: string;
    entityType: ImportEntityType;
    originalFileName: string;
    status: "draft" | "reviewed" | "processing" | "completed" | "failed";
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    importedRows: number;
    updatedRows: number;
    skippedRows: number;
    failedRows: number;
    duplicateStrategy: DuplicateStrategy;
    errorMessage: string | null;
  };
  rows: Array<{
    id: string;
    rowNumber: number;
    status: string;
    rawData: Record<string, string>;
    normalizedData: Record<string, unknown> | null;
    errors: Array<{ field: string; value?: string; message: string }> | null;
    warnings: string[] | null;
    duplicateKind: string | null;
  }>;
  pagination: {
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
    filter: string;
  };
};

const steps = ["Upload", "Map fields", "Review", "Import", "Results"] as const;
const filters = ["all", "ready", "duplicate", "invalid", "warning"] as const;

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body;
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "ready" || status === "imported" || status === "updated"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      : status === "duplicate" || status === "skipped"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        : status === "invalid" || status === "failed"
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          : "";
  return <Badge variant="outline" className={cn("capitalize", style)}>{status.replace("_", " ")}</Badge>;
}

export function ImportWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [entityType, setEntityType] = useState<ImportEntityType>("lead");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [strategy, setStrategy] = useState<DuplicateStrategy>("skip");
  const [details, setDetails] = useState<ImportDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!draft || details?.job.status === "completed") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft, details?.job.status]);

  const mappedFields = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping],
  );

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) return;
    setFile(nextFile);
    setDraft(null);
    setDetails(null);
    setStep(0);
  }

  async function inspectFile() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("entityType", entityType);
      const created = await readJson<DraftResponse>(
        await fetch("/api/imports", { method: "POST", body: form }),
      );
      setDraft(created);
      setMapping(created.suggestedMapping);
      setStep(1);
      toast.success(`${created.totalRows.toLocaleString()} rows are ready to map.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The CSV could not be inspected.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewRows() {
    if (!draft) return;
    setBusy(true);
    try {
      const reviewed = await readJson<ImportDetails>(
        await fetch(`/api/imports/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mapping, duplicateStrategy: strategy }),
        }),
      );
      setDetails(reviewed);
      setFilter("all");
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The rows could not be validated.");
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview(nextFilter: string, page = 1) {
    if (!draft) return;
    setBusy(true);
    try {
      const result = await readJson<ImportDetails>(
        await fetch(`/api/imports/${draft.id}?filter=${nextFilter}&page=${page}`),
      );
      setDetails(result);
      setFilter(nextFilter as (typeof filters)[number]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The preview could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!draft) return;
    setConfirmOpen(false);
    setStep(3);
    setBusy(true);
    try {
      const result = await readJson<ImportDetails>(
        await fetch(`/api/imports/${draft.id}/confirm`, { method: "POST" }),
      );
      setDetails(result);
      setStep(4);
      toast.success("CSV import completed.");
    } catch (error) {
      setStep(2);
      toast.error(error instanceof Error ? error.message : "The import could not be completed.");
      await loadPreview("all");
    } finally {
      setBusy(false);
    }
  }

  const readyCount = details
    ? details.job.validRows - details.job.duplicateRows
    : 0;
  const destinationHref =
    entityType === "lead"
      ? "/dashboard/leads"
      : entityType === "contact"
        ? "/dashboard/contacts"
        : "/dashboard/accounts";

  return (
    <div className="space-y-6">
      <ol aria-label="Import progress" className="grid grid-cols-5 gap-2">
        {steps.map((label, index) => (
          <li key={label} className="min-w-0">
            <div className={cn("h-1.5 rounded-full", index <= step ? "bg-primary" : "bg-muted")} />
            <p className={cn("mt-2 truncate text-xs font-medium sm:text-sm", index === step ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </p>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>1. Choose what to import</CardTitle>
              <CardDescription>Select the CRM record type represented by this file.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(["lead", "contact", "account"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setEntityType(type);
                    setFile(null);
                  }}
                  aria-pressed={entityType === type}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    entityType === type ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                  )}
                >
                  <span className="font-semibold">{IMPORT_ENTITY_DETAILS[type].pluralLabel}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">{IMPORT_ENTITY_DETAILS[type].description}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">Required: {IMPORT_ENTITY_DETAILS[type].requiredText}</span>
                </button>
              ))}
              <Button asChild variant="outline" className="mt-2 justify-start">
                <a href={`/api/imports/templates/${entityType}`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download {IMPORT_ENTITY_DETAILS[entityType].label.toLowerCase()} template
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>2. Upload a CSV file</CardTitle>
              <CardDescription>
                Up to {IMPORT_LIMITS.maxRows.toLocaleString()} rows, {IMPORT_LIMITS.maxColumns} columns, and {IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB. UTF-8 CSV only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                data-testid="csv-file-input"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
              <div
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  selectFile(event.dataTransfer.files[0]);
                }}
                className={cn(
                  "rounded-3xl border-2 border-dashed p-8 text-center transition sm:p-12",
                  dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/15",
                )}
              >
                <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 font-semibold">Drop your CSV here</h2>
                <p className="mt-2 text-sm text-muted-foreground">or choose a file from your device</p>
                <Button type="button" variant="outline" className="mt-5" onClick={() => inputRef.current?.click()}>
                  Choose CSV file
                </Button>
              </div>

              {file ? (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border bg-background p-4 sm:flex-row sm:items-center">
                  <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{Math.max(1, Math.ceil(file.size / 1024)).toLocaleString()} KB</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />Replace
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setFile(null)}>
                      <X className="mr-2 h-3.5 w-3.5" />Remove
                    </Button>
                  </div>
                </div>
              ) : null}

              <Button data-testid="inspect-csv" className="mt-5 w-full sm:w-auto" disabled={!file || busy} onClick={inspectFile}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Inspect CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === 1 && draft ? (
        <Card className="rounded-3xl">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Map CSV columns</CardTitle>
              <CardDescription className="mt-1">
                Match each source column to a LeadFlow field. Suggestions use exact aliases only.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMapping(draft.suggestedMapping)}>
              <RotateCcw className="mr-2 h-4 w-4" />Reset mappings
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="border-b bg-muted/30 text-left">
                  <tr><th className="p-4">CSV column</th><th className="p-4">Example values</th><th className="p-4">LeadFlow field</th></tr>
                </thead>
                <tbody>
                  {draft.samples.map((sample) => (
                    <tr key={sample.header} className="border-b last:border-0">
                      <td className="p-4 font-medium">{sample.header}</td>
                      <td className="max-w-sm p-4 text-muted-foreground">
                        <span className="line-clamp-2">{sample.values.join(" · ") || "Empty in sample rows"}</span>
                      </td>
                      <td className="p-4">
                        <Select
                          value={mapping[sample.header] ?? "ignore"}
                          onValueChange={(value) =>
                            setMapping((current) => ({
                              ...current,
                              [sample.header]: value === "ignore" ? null : value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full min-w-64" aria-label={`Map ${sample.header}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Do not import</SelectItem>
                            {IMPORT_FIELDS[entityType].map((field) => (
                              <SelectItem
                                key={field.key}
                                value={field.key}
                                disabled={mappedFields.has(field.key) && mapping[sample.header] !== field.key}
                              >
                                {field.label}{field.required ? " (required)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <fieldset className="mt-6">
              <legend className="font-semibold">Duplicate handling</legend>
              <p className="mt-1 text-sm text-muted-foreground">The safest option is selected by default. Blank CSV cells never erase existing values.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {([
                  ["skip", "Skip duplicates", "Leave existing records unchanged."],
                  ["update", "Update exact matches", "Update non-blank mapped fields when email or account name matches exactly."],
                  ["create_new", "Import as new", "Create another record even when an exact match exists."],
                ] as const).map(([value, label, description]) => (
                  <label key={value} className={cn("cursor-pointer rounded-2xl border p-4", strategy === value && "border-primary bg-primary/5")}>
                    <input className="sr-only" type="radio" name="strategy" value={value} checked={strategy === value} onChange={() => setStrategy(value)} />
                    <span className="font-medium">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
              <Button data-testid="review-csv" disabled={busy} onClick={reviewRows}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Validate and preview
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && details ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total rows", details.job.totalRows, "neutral"],
              ["Ready", readyCount, "success"],
              ["Duplicates", details.job.duplicateRows, "warning"],
              ["Invalid", details.job.invalidRows, "danger"],
            ].map(([label, value, tone]) => (
              <Card key={String(label)} className="rounded-2xl">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={cn("mt-1 text-3xl font-semibold", tone === "success" && "text-emerald-700", tone === "warning" && "text-amber-700", tone === "danger" && "text-red-700")}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Review rows</CardTitle>
              <CardDescription>Only validated rows will be processed. Invalid rows remain available as a safe CSV download.</CardDescription>
              <div className="flex flex-wrap gap-2 pt-2" aria-label="Preview filters">
                {filters.map((value) => (
                  <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => loadPreview(value)}>
                    {value === "all" ? "All rows" : value[0].toUpperCase() + value.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {details.rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No rows match this filter.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="border-b bg-muted/30 text-left">
                      <tr><th className="p-3">CSV row</th><th className="p-3">Status</th><th className="p-3">Normalized preview</th><th className="p-3">Details</th></tr>
                    </thead>
                    <tbody>
                      {details.rows.map((row) => (
                        <tr key={row.id} className="border-b align-top last:border-0">
                          <td className="p-3 font-medium">{row.rowNumber}</td>
                          <td className="p-3"><StatusBadge status={row.status} /></td>
                          <td className="max-w-lg p-3">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {Object.entries(row.normalizedData ?? {}).filter(([, value]) => value != null && value !== "").slice(0, 6).map(([key, value]) => (
                                <div key={key} className="contents"><dt className="truncate text-xs text-muted-foreground">{key}</dt><dd className="truncate text-xs">{String(value)}</dd></div>
                              ))}
                            </dl>
                          </td>
                          <td className="max-w-md p-3">
                            {row.duplicateKind ? <p className="text-xs text-amber-700">Duplicate: {row.duplicateKind === "within_file" ? "another CSV row" : "existing workspace record"}</p> : null}
                            {(row.errors?.length ?? 0) > 0 ? (
                              <details>
                                <summary className="cursor-pointer text-xs font-medium text-red-700">{row.errors?.length} validation issue{row.errors?.length === 1 ? "" : "s"}</summary>
                                <ul className="mt-2 space-y-1 text-xs text-red-700">
                                  {row.errors?.map((error, index) => <li key={`${error.field}-${index}`}>{error.field}: {error.message}</li>)}
                                </ul>
                              </details>
                            ) : null}
                            {row.warnings?.map((warning) => <p key={warning} className="mt-1 text-xs text-amber-700">{warning}</p>)}
                            {!row.duplicateKind && !row.errors?.length && !row.warnings?.length ? <span className="text-xs text-muted-foreground">Ready to import</span> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Page {details.pagination.page} of {details.pagination.pageCount}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={details.pagination.page <= 1 || busy} onClick={() => loadPreview(filter, details.pagination.page - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={details.pagination.page >= details.pagination.pageCount || busy} onClick={() => loadPreview(filter, details.pagination.page + 1)}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Adjust mappings</Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              {details.job.invalidRows > 0 ? (
                <Button asChild variant="outline"><a href={`/api/imports/${details.job.id}/rejected`}><Download className="mr-2 h-4 w-4" />Download rejected rows</a></Button>
              ) : null}
              <Button data-testid="confirm-csv" disabled={busy || readyCount + details.job.duplicateRows === 0} onClick={() => setConfirmOpen(true)}>
                <Check className="mr-2 h-4 w-4" />Confirm import
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <Card className="rounded-3xl">
          <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center" aria-live="polite">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h2 className="mt-5 text-xl font-semibold">Importing your records</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">LeadFlow is processing validated rows in controlled batches. You can safely retry if the network is interrupted.</p>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && details ? (
        <Card className="rounded-3xl">
          <CardContent className="p-6 sm:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-4 text-2xl font-semibold">Import complete</h2>
              <p className="mt-2 text-sm text-muted-foreground">{details.job.originalFileName} has finished processing.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-4">
                {[["Imported", details.job.importedRows], ["Updated", details.job.updatedRows], ["Skipped", details.job.skippedRows], ["Failed", details.job.failedRows]].map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl border bg-muted/20 p-4"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                ))}
              </div>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild><Link href={destinationHref}>View imported {IMPORT_ENTITY_DETAILS[entityType].pluralLabel.toLowerCase()}</Link></Button>
                {(details.job.failedRows > 0 || details.job.invalidRows > 0) ? (
                  <Button asChild variant="outline"><a href={`/api/imports/${details.job.id}/rejected`}><Download className="mr-2 h-4 w-4" />Download rejected rows</a></Button>
                ) : null}
                <Button asChild variant="outline"><Link href="/dashboard/import/history"><History className="mr-2 h-4 w-4" />Import history</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start this import?</AlertDialogTitle>
            <AlertDialogDescription>
              {readyCount.toLocaleString()} new rows and {details?.job.duplicateRows.toLocaleString() ?? 0} duplicate rows will follow the selected “{strategy.replace("_", " ")}” rule. Invalid rows will not be imported.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction data-testid="start-import" onClick={confirmImport}>Start import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ImportUnavailable({ demo = false }: { demo?: boolean }) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        {demo ? <FileSpreadsheet className="h-10 w-10 text-muted-foreground" /> : <AlertCircle className="h-10 w-10 text-muted-foreground" />}
        <h2 className="mt-4 text-xl font-semibold">{demo ? "CSV import is unavailable in the public demo" : "You do not have import access"}</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          {demo ? "The shared demo is read-only to keep sample data stable and prevent resource abuse." : "CSV imports are available to workspace Owners and Admins."}
        </p>
        <Button asChild variant="outline" className="mt-5"><Link href="/dashboard">Return to dashboard</Link></Button>
      </CardContent>
    </Card>
  );
}
