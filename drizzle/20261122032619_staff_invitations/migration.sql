CREATE TABLE "staff_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"business_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL CONSTRAINT "staff_invitations_token_hash_unique" UNIQUE,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_invitations_business_email_unique" UNIQUE("business_id","email"),
	CONSTRAINT "staff_invitations_single_terminal_state_check" CHECK (NOT ("accepted_at" IS NOT NULL AND "revoked_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX "staff_invitations_business_expires_idx" ON "staff_invitations" ("business_id","expires_at");--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_business_id_businesses_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT;