"use client";

import { useActionState, useEffect, useState } from "react";
import { z } from "zod";

import {
  createAppointmentAction,
  type AppointmentActionState,
} from "@/features/appointments/actions";

type PublicService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCrc: number;
};

type AvailableSlot = {
  staffId: string;
  staffName: string;
  startsAt: string;
  endsAt: string;
};

const availabilityResponseSchema = z.object({
  slots: z.array(
    z.object({
      staffId: z.uuid(),
      staffName: z.string(),
      startsAt: z.iso.datetime({ offset: true }),
      endsAt: z.iso.datetime({ offset: true }),
    }),
  ),
});

const initialState: AppointmentActionState = { error: null, success: null };
const currency = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export function BookingForm({
  businessId,
  services,
  timeZone,
  today,
}: {
  businessId: string;
  services: PublicService[];
  timeZone: string;
  today: string;
}) {
  const [state, action, isPending] = useActionState(
    createAppointmentAction,
    initialState,
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ businessId, serviceId, date });
    fetch(`/api/availability?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error("No pudimos consultar los espacios disponibles.");
        }
        const parsed = availabilityResponseSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error(
            "Recibimos una respuesta de disponibilidad inválida.",
          );
        }
        setSlots(parsed.data.slots);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "No pudimos consultar los espacios disponibles.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSlots(false);
      });

    return () => controller.abort();
  }, [businessId, date, serviceId]);

  const selectedSlot = slots.find(
    (slot) => `${slot.staffId}:${slot.startsAt}` === selectedSlotKey,
  );
  const selectedService = services.find((service) => service.id === serviceId);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-[#cce5d2] bg-[#f0f8f1] p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-full bg-[#d9f0de] text-lg text-[#1e5949]">
          ✓
        </span>
        <h3 className="mt-4 text-xl font-semibold text-[#1e5949]">
          Solicitud enviada
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#526b60]">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input name="businessId" type="hidden" value={businessId} />
      <input name="serviceId" type="hidden" value={serviceId} />
      <input name="staffId" type="hidden" value={selectedSlot?.staffId ?? ""} />
      <input
        name="startsAt"
        type="hidden"
        value={selectedSlot?.startsAt ?? ""}
      />

      <label className="block space-y-2 text-sm font-medium">
        <span>Elige un servicio</span>
        <select
          className="auth-input"
          onChange={(event) => {
            setSelectedSlotKey("");
            setAvailabilityError(null);
            setSlots([]);
            setIsLoadingSlots(true);
            setServiceId(event.target.value);
          }}
          value={serviceId}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} · {service.durationMinutes} min ·{" "}
              {currency.format(service.priceCrc)}
            </option>
          ))}
        </select>
      </label>

      <label className="block max-w-xs space-y-2 text-sm font-medium">
        <span>Fecha</span>
        <input
          className="auth-input"
          min={today}
          onChange={(event) => {
            setSelectedSlotKey("");
            setAvailabilityError(null);
            setSlots([]);
            setIsLoadingSlots(true);
            setDate(event.target.value);
          }}
          type="date"
          value={date}
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Horarios disponibles</legend>
        {isLoadingSlots ? (
          <p className="mt-3 text-sm text-[#71817c]">Buscando espacios…</p>
        ) : availabilityError ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {availabilityError}
          </p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-sm text-[#71817c]">
            No hay espacios disponibles para este día. Prueba con otra fecha.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => {
              const key = `${slot.staffId}:${slot.startsAt}`;
              const isSelected = key === selectedSlotKey;
              return (
                <label
                  key={key}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-left transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#34735e] ${isSelected ? "border-[#1e5949] bg-[#edf7ef] ring-1 ring-[#1e5949]" : "border-[#dfe7e1] bg-white hover:border-[#8ab69c]"}`}
                >
                  <input
                    checked={isSelected}
                    className="sr-only"
                    name="slot"
                    onChange={() => setSelectedSlotKey(key)}
                    type="radio"
                    value={key}
                  />
                  <span className="block text-sm font-semibold text-[#30453e]">
                    {new Intl.DateTimeFormat("es-CR", {
                      timeZone,
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(slot.startsAt))}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#829089]">
                    {slot.staffName}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <label className="block space-y-2 text-sm font-medium">
        <span>
          Nota para el negocio{" "}
          <span className="font-normal text-[#8a9892]">(opcional)</span>
        </span>
        <textarea
          className="auth-input h-24 resize-y py-3"
          maxLength={500}
          name="notes"
          placeholder="¿Hay algo que debamos saber?"
        />
      </label>

      {state.error && (
        <p
          aria-live="polite"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <button
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!selectedSlot || isPending || isLoadingSlots}
        type="submit"
      >
        {isPending
          ? "Enviando solicitud…"
          : selectedService
            ? `Solicitar cita · ${currency.format(selectedService.priceCrc)}`
            : "Solicitar cita"}
      </button>
      <p className="text-center text-xs leading-5 text-[#8a9892]">
        La solicitud queda pendiente hasta que el negocio confirme tu cita.
      </p>
    </form>
  );
}
