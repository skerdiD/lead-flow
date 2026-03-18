"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border group-[.toaster]:bg-popover/95 group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:text-sm group-[.toaster]:shadow-lg",
          title: "text-sm font-semibold text-popover-foreground",
          description: "text-xs text-muted-foreground",
          actionButton:
            "rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground",
          cancelButton:
            "rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground",
          success: "border-emerald-200/80 bg-emerald-50/80",
          error: "border-rose-200/80 bg-rose-50/80",
          warning: "border-amber-200/80 bg-amber-50/80",
          info: "border-sky-200/80 bg-sky-50/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
