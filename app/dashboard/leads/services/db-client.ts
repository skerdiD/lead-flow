import { db } from "@/db";

export type LeadDbClient = Pick<
  typeof db,
  "delete" | "insert" | "select" | "update"
>;
