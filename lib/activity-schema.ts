import { sql } from "drizzle-orm";
import { db } from "@/db";

let activitySchemaReady: Promise<void> | null = null;

async function createActivitySchema() {
  await db.execute(sql`
    DO $$
    BEGIN
      CREATE TYPE activity_event_type AS ENUM (
        'lead_created',
        'lead_updated',
        'lead_status_changed',
        'lead_deleted'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END
    $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS activity_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar(255) NOT NULL,
      event_type activity_event_type NOT NULL,
      message varchar(255) NOT NULL,
      lead_id uuid,
      lead_name varchar(120),
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS activity_events_user_id_idx
      ON activity_events (user_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS activity_events_user_id_created_at_idx
      ON activity_events (user_id, created_at);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS activity_events_user_id_event_type_idx
      ON activity_events (user_id, event_type);
  `);
}

export async function ensureActivitySchema() {
  if (!activitySchemaReady) {
    activitySchemaReady = createActivitySchema().catch((error) => {
      activitySchemaReady = null;
      throw error;
    });
  }

  await activitySchemaReady;
}
