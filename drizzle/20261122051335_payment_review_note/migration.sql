ALTER TABLE "payments" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_review_state", ADD CONSTRAINT "payments_review_state" CHECK ((
        ("status" = 'reported' and "reviewed_by" is null and "reviewed_at" is null and "review_note" is null)
        or
        ("status" = 'verified' and "reviewed_by" is not null and "reviewed_at" is not null and "review_note" is null)
        or
        ("status" = 'rejected' and "reviewed_by" is not null and "reviewed_at" is not null and "review_note" is not null and length(btrim("review_note")) between 3 and 300)
      ));