"use client";

import { useActionState } from "react";

import {
  createTimeOffAction,
  deleteTimeOffAction,
  type TimeOffActionState,
} from "@/features/time-off/actions";

type Absence = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

const initialState: TimeOffActionState = { error: null, success: null };

export function TimeOffManager({
  businessId,
  staffId,
  professionalName,
  timeZone,
  today,
  absences,
}: {
  businessId: string;
  staffId: string;
  professionalName: string;
  timeZone: string;
  today: string;
  absences: Absence[];
}) {
  const [state, action, isPending] = useActionState(
    createTimeOffAction,
    initialState,
  );

  return (
    <section className="mt-8 rounded-2xl border border-[#e2eae4] bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
          DÍAS LIBRES Y VACACIONES
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Ausencias de {professionalName}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#71817c]">
          El período se interpreta en la zona horaria del negocio. No se puede
          guardar si coincide con citas que ya estén pendientes o confirmadas.
        </p>
      </div>

      {absences.length > 0 && (
        <div className="mt-6 space-y-3">
          {absences.map((absence) => (
            <AbsenceCard
              absence={absence}
              businessId={businessId}
              staffId={staffId}
              key={absence.id}
              timeZone={timeZone}
            />
          ))}
        </div>
      )}

      <form action={action} className="mt-6 border-t border-[#edf1ed] pt-6">
        <input name="businessId" type="hidden" value={businessId} />
        <input name="staffId" type="hidden" value={staffId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium">
            <span>Desde</span>
            <div className="grid grid-cols-[1fr_0.8fr] gap-2">
              <input
                className="auth-input"
                defaultValue={today}
                min={today}
                name="startDate"
                required
                type="date"
              />
              <input
                aria-label="Hora de inicio de la ausencia"
                className="auth-input"
                defaultValue="09:00"
                name="startTime"
                required
                type="time"
              />
            </div>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Hasta</span>
            <div className="grid grid-cols-[1fr_0.8fr] gap-2">
              <input
                className="auth-input"
                defaultValue={today}
                min={today}
                name="endDate"
                required
                type="date"
              />
              <input
                aria-label="Hora de finalización de la ausencia"
                className="auth-input"
                defaultValue="17:00"
                name="endTime"
                required
                type="time"
              />
            </div>
          </label>
        </div>
        <label className="mt-4 block space-y-2 text-sm font-medium">
          <span>
            Motivo{" "}
            <span className="font-normal text-[#8a9892]">(opcional)</span>
          </span>
          <input
            className="auth-input"
            maxLength={200}
            name="reason"
            placeholder="Vacaciones, capacitación…"
          />
        </label>

        {state.error && (
          <p
            aria-live="polite"
            className="mt-4 text-sm text-red-700"
            role="alert"
          >
            {state.error}
          </p>
        )}
        {state.success && (
          <p
            aria-live="polite"
            className="mt-4 text-sm text-[#34735e]"
            role="status"
          >
            {state.success}
          </p>
        )}
        <button
          className="mt-5 flex h-11 items-center justify-center rounded-xl bg-[#1e5949] px-5 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Guardando…" : "Guardar ausencia"}
        </button>
      </form>
    </section>
  );
}

function AbsenceCard({
  absence,
  businessId,
  staffId,
  timeZone,
}: {
  absence: Absence;
  businessId: string;
  staffId: string;
  timeZone: string;
}) {
  const [state, action, isPending] = useActionState(
    deleteTimeOffAction,
    initialState,
  );
  const formatter = new Intl.DateTimeFormat("es-CR", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e6ede8] bg-[#fbfcfa] p-4">
      <div>
        <p className="text-sm font-semibold text-[#30453e]">
          {formatter.format(absence.startsAt)} –{" "}
          {formatter.format(absence.endsAt)}
        </p>
        {absence.reason && (
          <p className="mt-1 text-xs text-[#71817c]">{absence.reason}</p>
        )}
        {state.error && (
          <p className="mt-2 text-xs text-red-700" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="mt-2 text-xs text-[#34735e]" role="status">
            {state.success}
          </p>
        )}
      </div>
      <form action={action}>
        <input name="businessId" type="hidden" value={businessId} />
        <input name="staffId" type="hidden" value={staffId} />
        <input name="timeOffId" type="hidden" value={absence.id} />
        <button
          className="text-xs font-semibold text-[#9a5147] hover:underline disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Eliminando…" : "Eliminar"}
        </button>
      </form>
    </article>
  );
}
