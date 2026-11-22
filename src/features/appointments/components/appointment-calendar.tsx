"use client";

import FullCalendar from "@fullcalendar/react";
import breezyThemePlugin from "@fullcalendar/react/themes/breezy";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import spanishLocale from "@fullcalendar/react/locales/es";
import type { EventInput, EventSourceFuncInfo } from "@fullcalendar/react";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";

import {
  appointmentCalendarEventsSchema,
  type AppointmentCalendarEvent,
} from "@/features/appointments/calendar-schemas";

const statusLabels: Record<AppointmentCalendarEvent["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

const statusColors: Record<AppointmentCalendarEvent["status"], string> = {
  pending: "#b7791f",
  confirmed: "#34735e",
  cancelled: "#89938e",
  completed: "#496f83",
  no_show: "#a64d42",
};

const calendarErrorSchema = z.object({ error: z.string() });

export function AppointmentCalendar({
  businessId,
  businessName,
  staffId,
  timeZone,
}: {
  businessId: string;
  businessName: string;
  staffId?: string;
  timeZone: string;
}) {
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentCalendarEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const appointmentsById = useRef(new Map<string, AppointmentCalendarEvent>());

  const loadEvents = useCallback(
    async (fetchInfo: EventSourceFuncInfo): Promise<EventInput[]> => {
      const params = new URLSearchParams({
        businessId,
        start: fetchInfo.startStr,
        end: fetchInfo.endStr,
      });
      if (staffId) params.set("staffId", staffId);

      try {
        const response = await fetch(`/api/appointments/calendar?${params}`);
        const payload: unknown = await response.json();
        if (!response.ok) {
          const error = calendarErrorSchema.safeParse(payload);
          throw new Error(
            error.success
              ? error.data.error
              : "No pudimos cargar las citas del calendario.",
          );
        }

        const appointments = appointmentCalendarEventsSchema.parse(payload);
        appointmentsById.current = new Map(
          appointments.map((appointment) => [appointment.id, appointment]),
        );
        setLoadError(null);

        return appointments.map(
          (appointment) =>
            ({
              id: appointment.id,
              title: `${appointment.serviceName} · ${appointment.clientName}`,
              start: appointment.start,
              end: appointment.end,
              color: statusColors[appointment.status],
            }) satisfies EventInput,
        );
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "No pudimos cargar las citas del calendario.",
        );
        throw error;
      }
    },
    [businessId, staffId],
  );

  return (
    <section
      aria-labelledby={`calendar-title-${businessId}-${staffId ?? "all"}`}
      className="mt-8 rounded-2xl border border-[#e2eae4] bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
            AGENDA
          </p>
          <h2
            className="mt-2 text-2xl font-semibold tracking-tight"
            id={`calendar-title-${businessId}-${staffId ?? "all"}`}
          >
            Calendario de {businessName}
          </h2>
          <p className="mt-1 text-sm text-[#71817c]">
            Horarios mostrados según la zona horaria del negocio.
          </p>
        </div>
        <div aria-label="Estados de las citas" className="flex flex-wrap gap-3">
          {Object.entries(statusLabels).map(([status, label]) => (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-[#52645d]"
              key={status}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor:
                    statusColors[status as AppointmentCalendarEvent["status"]],
                }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {loadError && (
        <p
          className="mb-4 rounded-xl bg-[#fff6f4] p-3 text-sm text-[#9a5147]"
          role="alert"
        >
          {loadError}
        </p>
      )}

      <div className="calendar-shell">
        <FullCalendar
          allDaySlot={false}
          dayMaxEvents={3}
          dateClick={(info) =>
            info.view.calendar.changeView("timeGridDay", info.date)
          }
          eventClick={(info) => {
            const appointment = appointmentsById.current.get(info.event.id);
            setSelectedAppointment(appointment ?? null);
          }}
          events={loadEvents}
          expandRows
          firstDay={1}
          height="auto"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listWeek",
          }}
          initialView="timeGridWeek"
          locale={spanishLocale}
          nowIndicator
          plugins={[
            breezyThemePlugin,
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          slotDuration="00:15:00"
          timeZone={timeZone}
        />
      </div>

      {selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          timeZone={timeZone}
        />
      )}
    </section>
  );
}

function AppointmentDetails({
  appointment,
  timeZone,
}: {
  appointment: AppointmentCalendarEvent;
  timeZone: string;
}) {
  const formatter = new Intl.DateTimeFormat("es-CR", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <aside
      aria-label="Detalles de la cita seleccionada"
      className="mt-5 rounded-xl border border-[#dce8df] bg-[#f7f9f6] p-5"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#172b27]">
            {appointment.serviceName}
          </h3>
          <p className="mt-1 text-sm text-[#52645d]">
            {formatter.format(new Date(appointment.start))}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#52645d]">
          {statusLabels[appointment.status]}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[#71817c]">Cliente</dt>
          <dd className="mt-1 font-medium text-[#35554c]">
            {appointment.clientName}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#71817c]">Profesional</dt>
          <dd className="mt-1 font-medium text-[#35554c]">
            {appointment.professionalName}
          </dd>
        </div>
      </dl>
      {appointment.notes && (
        <p className="mt-3 text-sm text-[#52645d]">{appointment.notes}</p>
      )}
    </aside>
  );
}
