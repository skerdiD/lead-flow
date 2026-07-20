import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDebouncedCallback,
  normalizeSearchParam,
  SEARCH_DEBOUNCE_MS,
  updateSearchParams,
} from "@/lib/list-query-state";

describe("list query state", () => {
  afterEach(() => vi.useRealTimers());

  it("commits only after the shared 400 ms debounce", () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    const debounced = createDebouncedCallback(commit);

    debounced.schedule();
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(commit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("restarts, flushes, and cancels the timer", () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    const debounced = createDebouncedCallback(commit);
    debounced.schedule();
    vi.advanceTimersByTime(250);
    debounced.schedule();
    vi.advanceTimersByTime(399);
    expect(commit).not.toHaveBeenCalled();
    debounced.flush();
    expect(commit).toHaveBeenCalledTimes(1);
    debounced.schedule();
    debounced.cancel();
    vi.runAllTimers();
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("preserves unrelated URL state and resets pagination", () => {
    const current = new URLSearchParams("view=list&stage=new&page=4&sort=valueDesc");
    const next = updateSearchParams(current, { search: " Nina ", stage: null });
    expect(next.toString()).toBe("view=list&sort=valueDesc&search=Nina");
  });

  it("trims and caps server search values", () => {
    expect(normalizeSearchParam(`  ${"x".repeat(140)}  `)).toHaveLength(120);
  });
});
