const REQUEST_ID_HEADER = "x-request-id";

// UUIDs are unguessable correlation IDs, never authentication or authorization values.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSafeRequestId(value: string | null | undefined) {
  return Boolean(value && value.length <= 64 && UUID_PATTERN.test(value));
}

export function createRequestId(incomingRequestId?: string | null) {
  return isSafeRequestId(incomingRequestId)
    ? incomingRequestId!
    : crypto.randomUUID();
}

export function requestIdHeaders(requestId: string) {
  return { [REQUEST_ID_HEADER]: requestId };
}

export { REQUEST_ID_HEADER };
