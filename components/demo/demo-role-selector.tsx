"use client";

import { useState, type ComponentType } from "react";
import { Check, Crown, LoaderCircle, Settings2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { demoRoleDetails, type DemoRole } from "@/lib/demo";
import { cn } from "@/lib/utils";

type DemoRoleSelectorProps = {
  currentDemoRole: DemoRole | null;
};

const roleIcons: Record<DemoRole, ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Settings2,
  member: UsersRound,
};

const roleAccentClasses: Record<DemoRole, string> = {
  owner: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-200",
  admin: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200",
  member: "bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-200",
};

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "We couldn't prepare this demo role right now. Please try again.";
}

function getSignInUrl(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "signInUrl" in payload &&
    typeof payload.signInUrl === "string"
  ) {
    return payload.signInUrl;
  }

  return null;
}

export function DemoRoleSelector({ currentDemoRole }: DemoRoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPreparing = selectedRole !== null;

  async function continueAs(role: DemoRole) {
    if (isPreparing) return;

    setSelectedRole(role);
    setError(null);

    try {
      const response = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getErrorMessage(payload));
        return;
      }

      const signInUrl = getSignInUrl(payload);
      if (!signInUrl) {
        setError("We couldn't prepare this demo role right now. Please try again.");
        return;
      }

      window.location.assign(signInUrl);
    } catch {
      setError("We couldn't prepare this demo role right now. Please try again.");
    } finally {
      setSelectedRole(null);
    }
  }

  return (
    <div>
      {currentDemoRole ? (
        <p className="mb-5 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100">
          You are currently signed in as the {demoRoleDetails[currentDemoRole].label}{" "}
          demo user. Choose another role below to switch perspectives.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(["owner", "admin", "member"] as const).map((role) => {
          const details = demoRoleDetails[role];
          const Icon = roleIcons[role];
          const isSelected = selectedRole === role;

          return (
            <Card
              key={role}
              className="h-full border-border/80 bg-background/90 py-0 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.55)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_24px_60px_-34px_rgba(8,145,178,0.35)] dark:hover:border-cyan-800"
            >
              <CardContent className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-2xl",
                      roleAccentClasses[role],
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {currentDemoRole === role ? (
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-100">
                      Current role
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    {details.summary}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                    {details.label}
                  </h2>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                    {details.description}
                  </p>
                </div>

                <ul className="mt-5 space-y-3 text-sm leading-5 text-foreground">
                  {details.permissions.map((permission) => (
                    <li key={permission} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  className="mt-7 w-full"
                  size="lg"
                  disabled={isPreparing}
                  onClick={() => continueAs(role)}
                  aria-describedby={`demo-role-${role}-status`}
                >
                  {isSelected ? (
                    <>
                      <LoaderCircle className="animate-spin" aria-hidden="true" />
                      Preparing {details.label} demo…
                    </>
                  ) : (
                    `Continue as ${details.label}`
                  )}
                </Button>
                <p
                  id={`demo-role-${role}-status`}
                  className="mt-3 min-h-5 text-center text-xs text-muted-foreground"
                  aria-live={isSelected ? "polite" : undefined}
                >
                  {isSelected
                    ? "Signing you into the demo workspace…"
                    : currentDemoRole === role
                      ? "Continue with the role already active in this browser."
                      : "A short-lived secure sign-in link is created when you continue."}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p
        className="mt-5 min-h-5 text-center text-sm text-destructive"
        aria-live="assertive"
      >
        {error}
      </p>
    </div>
  );
}
