"use client";

import { useActionState } from "react";

import {
  saveWeeklyScheduleAction,
  type ScheduleActionState,
} from "@/features/working-hours/actions";

type DayHours = {
  weekday: number;
  startTime: string;
  endTime: string;
};

const weekdays = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const initialState: ScheduleActionState = { error: null, success: null };

export function ScheduleForm({
  businessId,
  staffId,
  professionalName,
  schedule,
}: {
  businessId: string;
  staffId: string;
  professionalName: string;
  schedule: DayHours[];
}) {
  const [state, action, isPending] = useActionState(
    saveWeeklyScheduleAction,
    initialState,
  );
  const hoursByDay = new Map(schedule.map((hours) => [hours.weekday, hours]));

  return (
    <section className="mt-8 rounded-2xl border border-[#e2eae4] bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
          HORARIO DEL PROFESIONAL
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Horario de {professionalName}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#52645d]">
          Configura un bloque de atención por día. Los espacios que se muestren
          a los clientes respetarán el horario de cada profesional.
        </p>
      </div>

      <form action={action} className="mt-6">
        <input name="businessId" type="hidden" value={businessId} />
        <input name="staffId" type="hidden" value={staffId} />
        <div className="divide-y divide-[#edf1ed]">
          {weekdays.map((weekday, index) => {
            const hours = hoursByDay.get(index);
            return (
              <div
                key={weekday}
                className="grid gap-3 py-4 sm:grid-cols-[1fr_1fr_1fr] sm:items-center"
              >
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input
                    className="size-4 accent-[#1e5949]"
                    defaultChecked={Boolean(hours)}
                    name={`open-${index}`}
                    type="checkbox"
                  />
                  {weekday}
                </label>
                <label className="flex items-center gap-2 text-xs text-[#52645d]">
                  <span className="w-12">Abre</span>
                  <input
                    aria-label={`${weekday}: hora de apertura`}
                    className="auth-input h-10"
                    defaultValue={hours?.startTime.slice(0, 5) ?? "09:00"}
                    name={`start-${index}`}
                    type="time"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-[#52645d]">
                  <span className="w-12">Cierra</span>
                  <input
                    aria-label={`${weekday}: hora de cierre`}
                    className="auth-input h-10"
                    defaultValue={hours?.endTime.slice(0, 5) ?? "17:00"}
                    name={`end-${index}`}
                    type="time"
                  />
                </label>
              </div>
            );
          })}
        </div>

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
          {isPending ? "Guardando…" : "Guardar horario"}
        </button>
      </form>
    </section>
  );
}
