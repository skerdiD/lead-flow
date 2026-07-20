"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClearFiltersButton({
  onClear,
  disabled = false,
  label = "Clear filters",
}: {
  onClear: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={disabled} data-testid="clear-filters">
      <X className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  );
}
