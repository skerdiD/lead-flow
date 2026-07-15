export const DEMO_WORKSPACE_NAME = "LeadFlow Demo Workspace";
export const DEMO_USER_EXTERNAL_ID = "leadflow-demo-user";
export const DEMO_DEFAULT_EMAIL = "leadflow-demo@example.com";
export const DEMO_WORKSPACE_HELPER_TEXT =
  "Explore realistic CRM activity with safe sample data.";
export const DEMO_MUTATION_MESSAGE =
  "Demo workspace is view-only. Explore the sample CRM data without changing the shared demo.";

export function isDemoWorkspaceName(name: string | null | undefined) {
  return name?.trim() === DEMO_WORKSPACE_NAME;
}

export function isDemoWorkspace(workspace: { name?: string | null } | null | undefined) {
  return isDemoWorkspaceName(workspace?.name);
}
