export const SEARCH_DEBOUNCE_MS = 400;
export const MAX_SEARCH_LENGTH = 120;

export type SearchParamValue = string | number | null | undefined;

export function normalizeSearchParam(value: string | string[] | undefined) {
  return (typeof value === "string" ? value : "").trim().slice(0, MAX_SEARCH_LENGTH);
}

export function updateSearchParams(
  current: URLSearchParams,
  updates: Readonly<Record<string, SearchParamValue>>,
  options: { resetPage?: boolean } = {},
) {
  const next = new URLSearchParams(current);

  for (const [key, value] of Object.entries(updates)) {
    const normalized = typeof value === "string" ? value.trim() : value;
    if (normalized === undefined) continue;
    if (normalized === null || normalized === "") next.delete(key);
    else next.set(key, String(normalized));
  }

  if (options.resetPage !== false) next.delete("page");
  return next;
}

export type DebouncedCallback = {
  schedule: () => void;
  flush: () => void;
  cancel: () => void;
};

export function createDebouncedCallback(
  callback: () => void,
  delay = SEARCH_DEBOUNCE_MS,
): DebouncedCallback {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  return {
    schedule() {
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        callback();
      }, delay);
    },
    flush() {
      const wasScheduled = timer !== undefined;
      cancel();
      if (wasScheduled) callback();
    },
    cancel,
  };
}
