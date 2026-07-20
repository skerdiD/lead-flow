"use client";

import type { KeyboardEvent, RefObject } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  onCommit,
  onClear,
  isPending,
  inputRef,
  placeholder,
  ariaLabel = "Search",
  className,
  testId = "url-search-input",
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onClear: () => void;
  isPending: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder: string;
  ariaLabel?: string;
  className?: string;
  testId?: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClear();
    }
  };

  return (
    <label className={cn("relative block min-w-0", className)}>
      <span className="sr-only">{ariaLabel}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-9"
        autoComplete="off"
        data-testid={testId}
      />
      {isPending ? (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Updating results" />
      ) : null}
    </label>
  );
}
