"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ExportLeadsMenuProps = {
  selectedIds?: string[];
  align?: "start" | "end";
  buttonLabel?: string;
  testId?: string;
};

function buildExportHref(
  format: "csv" | "pdf",
  searchParams: URLSearchParams,
  selectedIds: string[],
) {
  const params = new URLSearchParams(searchParams);
  params.delete("page");

  if (selectedIds.length > 0) {
    params.set("selected", selectedIds.join(","));
  } else {
    params.delete("selected");
  }

  params.set("format", format);
  return `/api/leads/export?${params.toString()}`;
}

export function ExportLeadsMenu({
  selectedIds = [],
  align = "end",
  buttonLabel = "Export",
  testId,
}: ExportLeadsMenuProps) {
  const searchParams = useSearchParams();

  const searchParamSnapshot = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-testid={testId}
          aria-label={buttonLabel}
        >
          <Download className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuItem asChild>
          <a
            href={buildExportHref("csv", searchParamSnapshot, selectedIds)}
            data-testid={testId ? `${testId}-csv` : undefined}
          >
            Download CSV
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={buildExportHref("pdf", searchParamSnapshot, selectedIds)}
            data-testid={testId ? `${testId}-pdf` : undefined}
          >
            Download PDF
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
