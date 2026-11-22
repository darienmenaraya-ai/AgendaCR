import { defineRelations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const instant = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const paymentMethod = pgEnum("payment_method", ["sinpe_mobile"]);

export const paymentStatus = pgEnum("payment_status", [
  "reported",
  "verified",
  "rejected",
]);

// Better Auth core tables. Singular schema keys let its adapter use the
// standard models while PostgreSQL keeps the project's plural table names.
export const user = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  (table) => [unique("users_email_unique").on(table.email)],
);

export const session = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expiresAt: instant("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("sessions_token_unique").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: instant("access_token_expires_at"),
    refreshTokenExpiresAt: instant("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: instant("expires_at").notNull(),
    createdAt: instant("created_at").notNull().defaultNow(),
    updatedAt: instant("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

// Shared by Better Auth and app limits so every server instance sees the same counters.
export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  count: bigint("count", { mode: "number" }).notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("America/Costa_Rica"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    createdAt: instant("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("businesses_slug_unique").on(table.slug),
    index("businesses_owner_id_idx").on(table.ownerId),
  ],
);

export const staffInvitations = pgTable(
  "staff_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    expiresAt: instant("expires_at").notNull(),
    acceptedAt: instant("accepted_at"),
    revokedAt: instant("revoked_at"),
    createdAt: instant("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("staff_invitations_business_email_unique").on(
      table.businessId,
      table.email,
    ),
    unique("staff_invitations_token_hash_unique").on(table.tokenHash),
    index("staff_invitations_business_expires_idx").on(
      table.businessId,
      table.expiresAt,
    ),
    check(
      "staff_invitations_single_terminal_state_check",
      sql`NOT (${table.acceptedAt} IS NOT NULL AND ${table.revokedAt} IS NOT NULL)`,
    ),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCrc: integer("price_crc").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    unique("services_id_business_id_unique").on(table.id, table.businessId),
    index("services_business_id_idx").on(table.businessId),
    check("services_duration_positive", sql`${table.durationMinutes} > 0`),
    check("services_price_non_negative", sql`${table.priceCrc} >= 0`),
  ],
);

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    unique("staff_business_user_unique").on(table.businessId, table.userId),
    unique("staff_id_business_id_unique").on(table.id, table.businessId),
    index("staff_business_id_idx").on(table.businessId),
    index("staff_user_id_idx").on(table.userId),
  ],
);

export const staffServices = pgTable(
  "staff_services",
  {
    staffId: uuid("staff_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    businessId: uuid("business_id").notNull(),
  },
  (table) => [
    primaryKey({
      name: "staff_services_pk",
      columns: [table.staffId, table.serviceId, table.businessId],
    }),
    foreignKey({
      name: "staff_services_staff_business_fk",
      columns: [table.staffId, table.businessId],
      foreignColumns: [staff.id, staff.businessId],
    }).onDelete("cascade"),
    foreignKey({
      name: "staff_services_service_business_fk",
      columns: [table.serviceId, table.businessId],
      foreignColumns: [services.id, services.businessId],
    }).onDelete("cascade"),
    foreignKey({
      name: "staff_services_business_fk",
      columns: [table.businessId],
      foreignColumns: [businesses.id],
    }).onDelete("cascade"),
  ],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (table) => [
    unique("working_hours_staff_day_start_unique").on(
      table.staffId,
      table.weekday,
      table.startTime,
    ),
    index("working_hours_staff_id_idx").on(table.staffId),
    check("working_hours_weekday_range", sql`${table.weekday} between 0 and 6`),
    check(
      "working_hours_positive_interval",
      sql`${table.startTime} < ${table.endTime}`,
    ),
  ],
);

export const timeOff = pgTable(
  "time_off",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    startsAt: instant("starts_at").notNull(),
    endsAt: instant("ends_at").notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("time_off_staff_id_idx").on(table.staffId),
    check(
      "time_off_positive_interval",
      sql`${table.startsAt} < ${table.endsAt}`,
    ),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "restrict" }),
    staffId: uuid("staff_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    startsAt: instant("starts_at").notNull(),
    endsAt: instant("ends_at").notNull(),
    status: appointmentStatus("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: instant("created_at").notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "appointments_staff_business_fk",
      columns: [table.staffId, table.businessId],
      foreignColumns: [staff.id, staff.businessId],
    }).onDelete("restrict"),
    foreignKey({
      name: "appointments_service_business_fk",
      columns: [table.serviceId, table.businessId],
      foreignColumns: [services.id, services.businessId],
    }).onDelete("restrict"),
    foreignKey({
      name: "appointments_staff_service_business_fk",
      columns: [table.staffId, table.serviceId, table.businessId],
      foreignColumns: [
        staffServices.staffId,
        staffServices.serviceId,
        staffServices.businessId,
      ],
    }).onDelete("restrict"),
    index("appointments_business_starts_at_idx").on(
      table.businessId,
      table.startsAt,
    ),
    index("appointments_staff_starts_at_idx").on(table.staffId, table.startsAt),
    index("appointments_client_starts_at_idx").on(
      table.clientId,
      table.startsAt,
    ),
    check(
      "appointments_positive_interval",
      sql`${table.startsAt} < ${table.endsAt}`,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "restrict" }),
    amountCrc: integer("amount_crc").notNull(),
    method: paymentMethod("method").notNull().default("sinpe_mobile"),
    reference: text("reference").notNull(),
    status: paymentStatus("status").notNull().default("reported"),
    reviewNote: text("review_note"),
    reportedBy: uuid("reported_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reviewedBy: uuid("reviewed_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    reviewedAt: instant("reviewed_at"),
    createdAt: instant("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("payments_appointment_created_at_idx").on(
      table.appointmentId,
      table.createdAt,
    ),
    index("payments_status_created_at_idx").on(table.status, table.createdAt),
    index("payments_reported_by_idx").on(table.reportedBy),
    check("payments_amount_positive", sql`${table.amountCrc} > 0`),
    check(
      "payments_reference_length",
      sql`length(btrim(${table.reference})) between 3 and 100`,
    ),
    check(
      "payments_review_state",
      sql`(
        (${table.status} = 'reported' and ${table.reviewedBy} is null and ${table.reviewedAt} is null and ${table.reviewNote} is null)
        or
        (${table.status} = 'verified' and ${table.reviewedBy} is not null and ${table.reviewedAt} is not null and ${table.reviewNote} is null)
        or
        (${table.status} = 'rejected' and ${table.reviewedBy} is not null and ${table.reviewedAt} is not null and ${table.reviewNote} is not null and length(btrim(${table.reviewNote})) between 3 and 300)
      )`,
    ),
  ],
);

export const authSchema = { user, session, account, verification, rateLimit };

export const relations = defineRelations(
  {
    user,
    session,
    account,
    verification,
    rateLimit,
    businesses,
    staffInvitations,
    services,
    staff,
    staffServices,
    workingHours,
    timeOff,
    appointments,
    payments,
  },
  (r) => ({
    user: {
      sessions: r.many.session(),
      accounts: r.many.account(),
      ownedBusinesses: r.many.businesses({
        from: r.user.id,
        to: r.businesses.ownerId,
      }),
      staffMemberships: r.many.staff({
        from: r.user.id,
        to: r.staff.userId,
      }),
      sentStaffInvitations: r.many.staffInvitations({
        from: r.user.id,
        to: r.staffInvitations.invitedBy,
      }),
      clientAppointments: r.many.appointments({
        from: r.user.id,
        to: r.appointments.clientId,
      }),
      reportedPayments: r.many.payments({
        from: r.user.id,
        to: r.payments.reportedBy,
      }),
      reviewedPayments: r.many.payments({
        from: r.user.id,
        to: r.payments.reviewedBy,
      }),
    },
    session: {
      user: r.one.user({ from: r.session.userId, to: r.user.id }),
    },
    account: {
      user: r.one.user({ from: r.account.userId, to: r.user.id }),
    },
    businesses: {
      owner: r.one.user({ from: r.businesses.ownerId, to: r.user.id }),
      services: r.many.services(),
      staff: r.many.staff(),
      invitations: r.many.staffInvitations(),
      appointments: r.many.appointments(),
    },
    staffInvitations: {
      business: r.one.businesses({
        from: r.staffInvitations.businessId,
        to: r.businesses.id,
      }),
      inviter: r.one.user({
        from: r.staffInvitations.invitedBy,
        to: r.user.id,
      }),
    },
    services: {
      business: r.one.businesses({
        from: r.services.businessId,
        to: r.businesses.id,
      }),
      staffAssignments: r.many.staffServices(),
      appointments: r.many.appointments(),
    },
    staff: {
      business: r.one.businesses({
        from: r.staff.businessId,
        to: r.businesses.id,
      }),
      user: r.one.user({ from: r.staff.userId, to: r.user.id }),
      serviceAssignments: r.many.staffServices(),
      workingHours: r.many.workingHours(),
      timeOff: r.many.timeOff(),
      appointments: r.many.appointments(),
    },
    staffServices: {
      staff: r.one.staff({
        from: [r.staffServices.staffId, r.staffServices.businessId],
        to: [r.staff.id, r.staff.businessId],
      }),
      service: r.one.services({
        from: [r.staffServices.serviceId, r.staffServices.businessId],
        to: [r.services.id, r.services.businessId],
      }),
    },
    workingHours: {
      staff: r.one.staff({
        from: r.workingHours.staffId,
        to: r.staff.id,
      }),
    },
    timeOff: {
      staff: r.one.staff({ from: r.timeOff.staffId, to: r.staff.id }),
    },
    appointments: {
      business: r.one.businesses({
        from: r.appointments.businessId,
        to: r.businesses.id,
      }),
      staff: r.one.staff({
        from: [r.appointments.staffId, r.appointments.businessId],
        to: [r.staff.id, r.staff.businessId],
      }),
      service: r.one.services({
        from: [r.appointments.serviceId, r.appointments.businessId],
        to: [r.services.id, r.services.businessId],
      }),
      client: r.one.user({
        from: r.appointments.clientId,
        to: r.user.id,
      }),
      payments: r.many.payments(),
    },
    payments: {
      appointment: r.one.appointments({
        from: r.payments.appointmentId,
        to: r.appointments.id,
      }),
      reporter: r.one.user({
        from: r.payments.reportedBy,
        to: r.user.id,
      }),
      reviewer: r.one.user({
        from: r.payments.reviewedBy,
        to: r.user.id,
      }),
    },
  }),
);
