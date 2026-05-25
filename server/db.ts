import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertValuationLead, users, valuationLeads } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Valuation Snapshot leads ─────────────────────────────────────────────────
// The Manus deploy runs with no_db_push, so it does not apply migrations. We create
// the table ourselves on first use with CREATE TABLE IF NOT EXISTS. It can only add
// a new table; it never touches the existing users table. Every write is non-fatal:
// if the DB is unreachable or the table cannot be made, a valuation still ships.

let _leadsTableReady: Promise<void> | null = null;

async function ensureValuationLeadsTable(db: Db): Promise<void> {
  if (!_leadsTableReady) {
    _leadsTableReady = db
      .execute(
        sql`
          CREATE TABLE IF NOT EXISTS valuation_leads (
            id VARCHAR(21) NOT NULL,
            brief_id VARCHAR(21) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            source VARCHAR(255),
            ip_hash VARCHAR(64),
            url VARCHAR(2048) NOT NULL,
            revenue VARCHAR(64),
            pretax_profit VARCHAR(64),
            owner_salary VARCHAR(64),
            company_name VARCHAR(255),
            company_domain VARCHAR(255),
            range_variant VARCHAR(16),
            range_text VARCHAR(64),
            buyer_types TEXT,
            vertical_matched VARCHAR(64),
            path_used VARCHAR(16),
            result_md TEXT,
            input_tokens INT,
            output_tokens INT,
            cached_input_tokens INT,
            generation_ms INT,
            contact_name VARCHAR(255),
            contact_email VARCHAR(320),
            contact_phone VARCHAR(64),
            pdf_requested BOOLEAN NOT NULL DEFAULT FALSE,
            pdf_requested_at TIMESTAMP NULL,
            booked BOOLEAN NOT NULL DEFAULT FALSE,
            PRIMARY KEY (id),
            UNIQUE KEY uq_valuation_leads_brief_id (brief_id)
          )
        `,
      )
      .then(() => undefined)
      .catch((error) => {
        _leadsTableReady = null; // let the next call retry
        throw error;
      });
  }
  return _leadsTableReady;
}

/** Insert one lead row when a valuation is generated. Non-fatal. */
export async function insertValuationLead(row: InsertValuationLead): Promise<void> {
  const db = await getDb();
  if (!db) return; // no DB configured; skip, never block a valuation
  try {
    await ensureValuationLeadsTable(db);
    await db.insert(valuationLeads).values(row);
  } catch (error) {
    console.error("[leads] insert failed (non-fatal):", error);
  }
}

/** Update the same row when the seller asks for the one-page brief. Non-fatal. */
export async function markValuationLeadPdfRequested(
  briefId: string,
  patch: Partial<InsertValuationLead>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await ensureValuationLeadsTable(db);
    await db
      .update(valuationLeads)
      .set({ ...patch, pdfRequested: true, pdfRequestedAt: new Date() })
      .where(eq(valuationLeads.briefId, briefId));
  } catch (error) {
    console.error("[leads] pdf-request update failed (non-fatal):", error);
  }
}
