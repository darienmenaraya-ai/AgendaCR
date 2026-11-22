import { timingSafeEqual } from "node:crypto";

export function hasValidCronAuthorization(
  request: Request,
  secret: string | undefined,
): boolean {
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}
