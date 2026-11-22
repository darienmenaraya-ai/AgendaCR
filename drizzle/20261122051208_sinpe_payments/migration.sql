CREATE TYPE "payment_method" AS ENUM('sinpe_mobile');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('reported', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" uuid NOT NULL,
	"amount_crc" integer NOT NULL,
	"method" "payment_method" DEFAULT 'sinpe_mobile'::"payment_method" NOT NULL,
	"reference" text NOT NULL,
	"status" "payment_status" DEFAULT 'reported'::"payment_status" NOT NULL,
	"reported_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("amount_crc" > 0),
	CONSTRAINT "payments_reference_length" CHECK (length(btrim("reference")) between 3 and 100),
	CONSTRAINT "payments_review_state" CHECK ((
        ("status" = 'reported' and "reviewed_by" is null and "reviewed_at" is null)
        or
        ("status" in ('verified', 'rejected') and "reviewed_by" is not null and "reviewed_at" is not null)
      ))
);
--> statement-breakpoint
CREATE INDEX "payments_appointment_created_at_idx" ON "payments" ("appointment_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_created_at_idx" ON "payments" ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_reported_by_idx" ON "payments" ("reported_by");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reported_by_users_id_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reviewed_by_users_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT;