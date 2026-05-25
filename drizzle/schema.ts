import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { nanoid } from "nanoid";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Valuation Snapshot leads. One row per valuation run. The contact fields fill in
 * later, on the same row, if the seller asks for the one-page brief. The two moments
 * are joined by brief_id. See tools/exit-brief/bundle/03-lead-db-schema.md.
 *
 * Created at runtime by ensureValuationLeadsTable() in server/db.ts, because the
 * Manus deploy runs with no_db_push (no automatic migrations).
 */
export const valuationLeads = mysqlTable("valuation_leads", {
  // meta
  id: varchar("id", { length: 21 }).primaryKey().$defaultFn(() => nanoid()),
  briefId: varchar("brief_id", { length: 21 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  source: varchar("source", { length: 255 }),
  ipHash: varchar("ip_hash", { length: 64 }),

  // inputs (what the seller entered; all optional except url)
  url: varchar("url", { length: 2048 }).notNull(),
  revenue: varchar("revenue", { length: 64 }),
  pretaxProfit: varchar("pretax_profit", { length: 64 }),
  ownerSalary: varchar("owner_salary", { length: 64 }),

  // output shown (from the JSON meta block)
  companyName: varchar("company_name", { length: 255 }),
  companyDomain: varchar("company_domain", { length: 255 }),
  rangeVariant: varchar("range_variant", { length: 16 }), // "number" or "by_hand"
  rangeText: varchar("range_text", { length: 64 }), // "₪16M to ₪21M" or ""
  buyerTypes: text("buyer_types"),
  verticalMatched: varchar("vertical_matched", { length: 64 }),
  pathUsed: varchar("path_used", { length: 16 }), // A, B, backup, wild_card
  resultMd: text("result_md"), // the three cards the seller actually saw

  // run cost + timing (per-valuation economics)
  inputTokens: int("input_tokens"),
  outputTokens: int("output_tokens"),
  cachedInputTokens: int("cached_input_tokens"),
  generationMs: int("generation_ms"),

  // contact (fills in on the PDF request)
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 64 }),

  // engagement
  pdfRequested: boolean("pdf_requested").default(false).notNull(),
  pdfRequestedAt: timestamp("pdf_requested_at"),
  booked: boolean("booked").default(false).notNull(),
});

export type ValuationLead = typeof valuationLeads.$inferSelect;
export type InsertValuationLead = typeof valuationLeads.$inferInsert;