CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY,
	"count" bigint NOT NULL,
	"last_request" bigint NOT NULL
);
