export const rateLimitPolicies = {
  "read:authenticated": { max: 300, window: "1m", failClosed: false, category: "read" },
  "lead:create": { max: 30, window: "1m", failClosed: false, category: "crm-create" },
  "contact:create": { max: 30, window: "1m", failClosed: false, category: "crm-create" },
  "account:create": { max: 30, window: "1m", failClosed: false, category: "crm-create" },
  "deal:create": { max: 30, window: "1m", failClosed: false, category: "crm-create" },
  "task:create": { max: 30, window: "1m", failClosed: false, category: "crm-create" },
  "crm:mutation": { max: 120, window: "1m", failClosed: false, category: "mutation" },
  "crm:bulk": { max: 10, window: "5m", failClosed: false, category: "bulk" },
  "lead:export": { max: 5, window: "10m", failClosed: false, category: "export" },
  "csv:import": { max: 3, window: "10m", failClosed: false, category: "import" },
  "invitation:create": { max: 5, window: "1h", failClosed: false, category: "invitation" },
  "invitation:resend": { max: 5, window: "1h", failClosed: false, category: "invitation" },
  "invitation:accept": { max: 10, window: "10m", failClosed: true, category: "authentication" },
  "ownership:transfer": { max: 3, window: "1h", failClosed: false, category: "privileged" },
  "ai:operation": { max: 5, window: "10m", failClosed: false, category: "ai" },
  "demo:login": { max: 5, window: "10m", failClosed: true, category: "authentication" },
  "auth:sensitive": { max: 10, window: "10m", failClosed: true, category: "authentication" },
  "analytics:expensive": { max: 30, window: "5m", failClosed: false, category: "analytics" },
} as const;

export type RateLimitAction = keyof typeof rateLimitPolicies;
export type RateLimitPolicy = (typeof rateLimitPolicies)[RateLimitAction];
