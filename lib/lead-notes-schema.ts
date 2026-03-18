import { sql } from "drizzle-orm";
import { db } from "@/db";

let leadNotesSchemaReady: Promise<void> | null = null;

async function createLeadNotesSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lead_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar(255) NOT NULL,
      lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS lead_notes_user_id_idx
      ON lead_notes (user_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS lead_notes_lead_id_idx
      ON lead_notes (lead_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS lead_notes_user_id_created_at_idx
      ON lead_notes (user_id, created_at);
  `);
}

export async function ensureLeadNotesSchema() {
  if (!leadNotesSchemaReady) {
    leadNotesSchemaReady = createLeadNotesSchema().catch((error) => {
      leadNotesSchemaReady = null;
      throw error;
    });
  }

  await leadNotesSchemaReady;
}
