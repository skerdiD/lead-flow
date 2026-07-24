import "server-only";

import { revalidatePath as nextRevalidatePath } from "next/cache";
import { logger } from "@/lib/logger.server";

/** Cache invalidation is retryable and must not reverse a committed result. */
export function revalidatePathBestEffort(path: string, type?: "layout" | "page") {
  try {
    if (type) nextRevalidatePath(path, type);
    else nextRevalidatePath(path);
    return true;
  } catch (error) {
    logger.warn("cache_revalidation_failed", "A committed mutation could not invalidate a route cache.", {
      route: path,
      operation: "cache.revalidate",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCategory: "secondary_async_failure",
    });
    return false;
  }
}
