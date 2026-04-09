export function isSafeE2ETestMode() {
  return (
    process.env.E2E_TEST_MODE === "1" &&
    process.env.NODE_ENV !== "production" &&
    Boolean(process.env.E2E_TEST_SECRET)
  );
}
