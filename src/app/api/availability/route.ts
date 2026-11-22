import { connection } from "next/server";
import { z } from "zod";

import { findAvailableSlotsForService } from "@/features/availability/queries";
import { checkRateLimit, getRequestIdentifier } from "@/lib/rate-limit";

const availabilityQuerySchema = z.object({
  businessId: z.uuid(),
  serviceId: z.uuid(),
  date: z.iso.date(),
});

export async function GET(request: Request) {
  await connection();

  try {
    const limit = await checkRateLimit({
      scope: "availability",
      identifier: getRequestIdentifier(request.headers),
      maximum: 60,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return Response.json(
        {
          error:
            "Hiciste muchas consultas. Espera un minuto e inténtalo de nuevo.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }
  } catch (error) {
    console.error("No se pudo comprobar el límite de disponibilidad.", error);
    return Response.json(
      { error: "No podemos consultar horarios en este momento." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    businessId: url.searchParams.get("businessId"),
    serviceId: url.searchParams.get("serviceId"),
    date: url.searchParams.get("date"),
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Indica un negocio, servicio y fecha válidos." },
      { status: 400 },
    );
  }

  try {
    const result = await findAvailableSlotsForService(parsed.data);

    if (result.status === "business-not-found") {
      return Response.json(
        { error: "No encontramos ese negocio." },
        { status: 404 },
      );
    }
    if (result.status === "service-not-found") {
      return Response.json(
        { error: "Ese servicio no está disponible." },
        { status: 404 },
      );
    }
    if (result.status === "invalid-timezone") {
      return Response.json(
        {
          error: "No pudimos calcular el día para la zona horaria del negocio.",
        },
        { status: 422 },
      );
    }

    return Response.json({
      date: parsed.data.date,
      timeZone: result.timeZone,
      slots: result.slots.map(({ staffId, staffName, startsAt, endsAt }) => ({
        staffId,
        staffName,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("No se pudo calcular la disponibilidad.", error);
    return Response.json(
      { error: "No pudimos consultar los horarios disponibles." },
      { status: 500 },
    );
  }
}
