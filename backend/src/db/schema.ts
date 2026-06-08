import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    externalId: integer("external_id").notNull(),
    nome: text("nome").notNull(),
    codigoBarras: text("codigo_barras"),
    dataVencimento: text("data_vencimento").notNull(),
    observacoes: text("observacoes"),
    deviceUuid: text("device_uuid").notNull(),
    userEmail: text("user_email").notNull(),
    criadoEm: text("criado_em").notNull(),
    atualizadoEm: text("atualizado_em").notNull(),
    deletadoEm: text("deletado_em"),
  },
  (table) => ({
    uniqueExtIdPerDevice: uniqueIndex("uq_product_ext_id_device").on(
      table.externalId,
      table.deviceUuid
    ),
  })
);

export type ProductInsert = typeof products.$inferInsert;
export type ProductSelect = typeof products.$inferSelect;

export const emailLogs = sqliteTable(
  "email_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .references(() => products.id)
      .notNull(),
    deviceUuid: text("device_uuid").notNull(),
    userEmail: text("user_email").notNull(),
    daysRemaining: integer("days_remaining").notNull(),
    slot: text("slot", { enum: ["morning", "afternoon", "evening"] }).notNull(),
    alertType: text("alert_type")
      .default("expiration_warning")
      .notNull(),
    status: text("status", {
      enum: [
        "planned",
        "attempted",
        "sent",
        "duplicate_ignored",
        "business_rule_ignored",
        "failed",
        "retryable",
      ],
    }).notNull(),
    errorMessage: text("error_message"),
    attemptedAt: text("attempted_at").notNull(),
    sentAt: text("sent_at"),
  },
  (table) => ({
    uniqueAlert: uniqueIndex("uq_alert_per_product_day_slot").on(
      table.productId,
      table.daysRemaining,
      table.slot,
      table.alertType
    ),
  })
);

export type EmailLogInsert = typeof emailLogs.$inferInsert;
export type EmailLogSelect = typeof emailLogs.$inferSelect;

export const medicationBarcodeCache = sqliteTable(
  "medication_barcode_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    barcode: text("barcode").notNull().unique(),
    name: text("name").notNull(),
    dosage: text("dosage"),
    form: text("form", {
      enum: ["comprimido", "capsula", "gotas", "ml", "sache", "ampola", "pomada", "spray", "outro"],
    }),
    source: text("source").notNull().default("manual-user-confirmed"),
    confidence: real("confidence").notNull().default(0.5),
    confirmedBy: text("confirmed_by"),
    confirmedAt: text("confirmed_at"),
    createdAt: text("created_at").notNull().default("(datetime('now'))"),
    updatedAt: text("updated_at").notNull().default("(datetime('now'))"),
  },
  (table) => ({
    barcodeUnique: uniqueIndex("uq_barcode_cache").on(table.barcode),
  })
);

export type MedicationBarcodeCacheInsert = typeof medicationBarcodeCache.$inferInsert;
export type MedicationBarcodeCacheSelect = typeof medicationBarcodeCache.$inferSelect;
