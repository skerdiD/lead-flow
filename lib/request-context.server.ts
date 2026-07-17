import "server-only";

import { headers } from "next/headers";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

/** Reads the proxy-propagated ID, with a safe fallback for server actions. */
export async function getRequestId() {
  try {
    return createRequestId((await headers()).get(REQUEST_ID_HEADER));
  } catch {
    // Background jobs and unit tests have no Next request store.
    return createRequestId();
  }
}
