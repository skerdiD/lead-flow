"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createDebouncedCallback,
  MAX_SEARCH_LENGTH,
  SEARCH_DEBOUNCE_MS,
  type SearchParamValue,
  updateSearchParams,
} from "@/lib/list-query-state";

type CommitOptions = {
  search?: string;
  resetPage?: boolean;
};

export function useDebouncedUrlSearch({
  initialSearch = "",
  searchParam = "search",
  canCommit = () => true,
}: {
  initialSearch?: string;
  searchParam?: string;
  canCommit?: () => boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearchState] = useState(initialSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef(search);
  const committedSearchRef = useRef(initialSearch);
  const paramsRef = useRef(searchParams);
  const canCommitRef = useRef(canCommit);
  const commitRef = useRef<() => void>(() => undefined);
  const debouncerRef = useRef<ReturnType<typeof createDebouncedCallback> | null>(null);

  const replace = useCallback(
    (
      updates: Readonly<Record<string, SearchParamValue>> = {},
      options: CommitOptions = {},
    ) => {
      debouncerRef.current?.cancel();
      const nextSearch = (options.search ?? searchRef.current).trim().slice(0, MAX_SEARCH_LENGTH);
      const next = updateSearchParams(
        paramsRef.current,
        { ...updates, [searchParam]: nextSearch || null },
        { resetPage: options.resetPage },
      );
      const query = next.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      const currentQuery = paramsRef.current.toString();

      committedSearchRef.current = nextSearch;
      if (query === currentQuery) return;

      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [pathname, router, searchParam],
  );

  useEffect(() => {
    paramsRef.current = searchParams;
    canCommitRef.current = canCommit;
    commitRef.current = () => {
      if (!canCommitRef.current()) {
        debouncerRef.current?.schedule();
        return;
      }
      replace();
    };
  }, [canCommit, replace, searchParams]);

  useEffect(() => {
    const debouncer = createDebouncedCallback(
      () => commitRef.current(),
      SEARCH_DEBOUNCE_MS,
    );
    debouncerRef.current = debouncer;
    return () => debouncer.cancel();
  }, []);

  const setSearch = useCallback((value: string) => {
    const next = value.slice(0, MAX_SEARCH_LENGTH);
    searchRef.current = next;
    setSearchState(next);
    debouncerRef.current?.cancel();

    if (!next) {
      replace({}, { search: "" });
      return;
    }
    if (next.trim() !== committedSearchRef.current) {
      debouncerRef.current?.schedule();
    }
  }, [replace]);

  const commitSearch = useCallback(() => {
    debouncerRef.current?.cancel();
    if (canCommitRef.current()) replace();
    else debouncerRef.current?.schedule();
  }, [replace]);

  const clearSearch = useCallback(() => {
    debouncerRef.current?.cancel();
    searchRef.current = "";
    setSearchState("");
    replace({}, { search: "" });
  }, [replace]);

  const clear = useCallback((updates: Readonly<Record<string, SearchParamValue>> = {}) => {
    debouncerRef.current?.cancel();
    searchRef.current = "";
    setSearchState("");
    replace(updates, { search: "" });
  }, [replace]);

  useEffect(() => {
    const urlSearch = searchParams.get(searchParam) ?? "";
    if (urlSearch !== committedSearchRef.current) {
      debouncerRef.current?.cancel();
      committedSearchRef.current = urlSearch;
      searchRef.current = urlSearch;
      const syncTimer = setTimeout(() => setSearchState(urlSearch), 0);
      return () => clearTimeout(syncTimer);
    }
  }, [searchParam, searchParams]);

  return {
    search,
    setSearch,
    commitSearch,
    clearSearch,
    clear,
    replace,
    isPending,
    inputRef,
  };
}
