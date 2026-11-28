import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { headers } from "next/headers";
import { connection } from "next/server";

import { findAvailableSlotsForService } from "@/features/availability/queries";
import {
  assistantRequestSchema,
  buildAssistantSystemPrompt,
} from "@/features/ai-assistant/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(request: Request) {
  await connection();

  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json(
      { error: "Inicia sesión para usar el asistente." },
      { status: 401 },
    );
  }

  try {
    const limit = await checkRateLimit({
      scope: "booking-assistant",
      identifier: session.user.id,
      maximum: 8,
      windowSeconds: 10 * 60,
    });
    if (!limit.allowed) {
      return Response.json(
        {
          error:
            "Has usado varias consultas. Espera unos minutos para volver a intentarlo.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }
    const dailyLimit = await checkRateLimit({
      scope: "booking-assistant-daily",
      identifier: session.user.id,
      maximum: 20,
      windowSeconds: 24 * 60 * 60,
    });
    if (!dailyLimit.allowed) {
      return Response.json(
        {
          error:
            "Alcanzaste el límite diario del asistente. Puedes reservar usando el formulario normal.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(dailyLimit.retryAfterSeconds) },
        },
      );
    }
    const applicationLimit = await checkRateLimit({
      scope: "booking-assistant-global-daily",
      identifier: "all-users",
      maximum: 60,
      windowSeconds: 24 * 60 * 60,
    });
    if (!applicationLimit.allowed) {
      return Response.json(
        {
          error:
            "El asistente alcanzó el límite diario del proyecto. Puedes continuar con la reserva normal.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(applicationLimit.retryAfterSeconds),
          },
        },
      );
    }
  } catch (error) {
    console.error("No se pudo comprobar el límite del asistente.", error);
    return Response.json(
      { error: "El asistente no está disponible en este momento." },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_000) {
    return Response.json(
      { error: "La conversación es demasiado larga." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 16_000) {
      return Response.json(
        { error: "La conversación es demasiado larga." },
        { status: 413 },
      );
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: "No pudimos leer la consulta." },
      { status: 400 },
    );
  }

  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return Response.json(
      { error: "Envía una consulta válida para el asistente." },
      { status: 400 },
    );
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "El asistente aún no está conectado a un proveedor de IA." },
      { status: 503 },
    );
  }

  try {
    const { businessId, serviceId, date, messages } = parsed.data;
    const lookup = await findAvailableSlotsForService({
      businessId,
      serviceId,
      date,
    });
    if (lookup.status !== "ok") {
      return Response.json(
        { error: "No pudimos consultar este servicio y su disponibilidad." },
        { status: 404 },
      );
    }

    const { db } = await import("@/db");
    const { businesses, services } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [business] = await db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    const [service] = await db
      .select({
        name: services.name,
        durationMinutes: services.durationMinutes,
        priceCrc: services.priceCrc,
      })
      .from(services)
      .where(
        and(
          eq(services.id, serviceId),
          eq(services.businessId, businessId),
          eq(services.active, true),
        ),
      )
      .limit(1);

    if (!business || !service) {
      return Response.json(
        { error: "No encontramos ese servicio para este negocio." },
        { status: 404 },
      );
    }

    const openai = createOpenAI({ apiKey });
    const result = await generateText({
      model: openai(process.env.AI_MODEL || "gpt-4.1-mini"),
      system: buildAssistantSystemPrompt({
        businessName: business.name,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        priceCrc: service.priceCrc,
        date,
        timeZone: lookup.timeZone,
        availableSlots: lookup.slots,
      }),
      messages: messages.map(({ role, text }) => ({ role, content: text })),
      maxOutputTokens: 350,
      abortSignal: AbortSignal.timeout(20_000),
      providerOptions: { openai: { store: false } },
    });

    return Response.json({ answer: result.text });
  } catch (error) {
    console.error("Falló la respuesta del asistente de reservas.", error);
    return Response.json(
      {
        error:
          "No pudimos responder ahora. Puedes continuar con la reserva normal.",
      },
      { status: 502 },
    );
  }
}
