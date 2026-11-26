"use client";

import { useState } from "react";

import type { AssistantConversationMessage } from "@/features/ai-assistant/schemas";

export function BookingAssistant({
  businessId,
  serviceId,
  serviceName,
  date,
  isConfigured,
}: {
  businessId: string;
  serviceId: string;
  serviceName: string;
  date: string;
  isConfigured: boolean;
}) {
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isSending || messages.length >= 8) return;

    const nextMessages: AssistantConversationMessage[] = [
      ...messages,
      { role: "user", text },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId,
          date,
          messages: nextMessages,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !isAssistantResponse(body)) {
        throw new Error(
          isAssistantError(body)
            ? body.error
            : "No pudimos consultar el asistente.",
        );
      }
      setMessages([...nextMessages, { role: "assistant", text: body.answer }]);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No pudimos consultar el asistente.",
      );
      setMessages(messages);
      setInput(text);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      aria-labelledby="booking-assistant-title"
      className="rounded-2xl border border-[#dce9df] bg-[#f7faf6] p-4 sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#34735e]">
        AYUDA PARA ELEGIR
      </p>
      <h3
        className="mt-1 text-base font-semibold text-[#172b27]"
        id="booking-assistant-title"
      >
        Asistente de reservas
      </h3>
      <p className="mt-1 text-sm leading-5 text-[#52645d]">
        Pregunta por {serviceName || "el servicio"} para la fecha seleccionada.
        La IA sugiere; tú eliges el espacio y envías la solicitud.
      </p>

      {!isConfigured ? (
        <p className="mt-3 rounded-xl border border-[#e2eae4] bg-white px-3 py-2 text-sm leading-5 text-[#52645d]">
          El asistente se activará al configurar la clave de IA del proyecto.
          Puedes consultar y reservar horarios con el formulario normal.
        </p>
      ) : (
        <>
          {messages.length > 0 && (
            <ol
              aria-live="polite"
              className="mt-4 max-h-64 space-y-3 overflow-y-auto"
            >
              {messages.map((message, index) => (
                <li
                  key={`${message.role}-${index}`}
                  className={`rounded-xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-6 bg-white text-[#30453e]" : "mr-6 bg-[#eaf3ec] text-[#23483b]"}`}
                >
                  <span className="font-semibold">
                    {message.role === "user" ? "Tú" : "AgendaCR"}:{" "}
                  </span>
                  {message.text}
                </li>
              ))}
            </ol>
          )}

          <label className="sr-only" htmlFor="booking-assistant-input">
            Pregunta al asistente
          </label>
          <div className="mt-4 flex gap-2">
            <input
              autoComplete="off"
              className="auth-input min-w-0 flex-1"
              id="booking-assistant-input"
              maxLength={1_000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="¿Qué horarios hay?"
              value={input}
            />
            <button
              className="shrink-0 rounded-xl bg-[#1e5949] px-4 text-sm font-semibold text-white transition hover:bg-[#17483b] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                !serviceId || !input.trim() || isSending || messages.length >= 8
              }
              onClick={() => void sendMessage()}
              type="button"
            >
              {isSending ? "Consultando…" : "Preguntar"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <p className="mt-2 text-xs leading-5 text-[#64756d]">
            Disponibilidad consultada para {date}. Revisa y selecciona el
            horario en la lista antes de reservar.
          </p>
        </>
      )}
    </section>
  );
}

function isAssistantResponse(value: unknown): value is { answer: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "answer" in value &&
    typeof value.answer === "string"
  );
}

function isAssistantError(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}
