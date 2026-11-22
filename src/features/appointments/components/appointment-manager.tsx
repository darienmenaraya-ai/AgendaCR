"use client";

import { useMemo, useState } from "react";

import { AppointmentStatusButtons } from "@/features/appointments/components/appointment-status-buttons";
import { BusinessPaymentManager } from "@/features/payments/components/business-payment-manager";
import type { BusinessPaymentRecord } from "@/features/payments/types";

export type OwnerAppointment = {
  id: string;
  businessId: string;
  businessName: string;
  timeZone: string;
  serviceName: string;
  professionalName: string;
  clientName: string;
  startsAt: Date;
  endsAt: Date;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes: string | null;
  payments: BusinessPaymentRecord[];
};

const statusLabels: Record<OwnerAppointment["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

export function AppointmentManager({
  appointments,
  now,
}: {
  appointments: OwnerAppointment[];
  now: Date;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const pendingCount = appointments.filter(
    (appointment) => appointment.status === "pending",
  ).length;
  const filteredAppointments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es-CR");
    return appointments.filter((appointment) => {
      if (statusFilter !== "all" && appointment.status !== statusFilter) {
        return false;
      }
      if (
        dateFilter &&
        formatDateInTimeZone(appointment.startsAt, appointment.timeZone) !==
          dateFilter
      ) {
        return false;
      }
      if (normalizedSearch) {
        const searchableText = [
          appointment.businessName,
          appointment.serviceName,
          appointment.professionalName,
          appointment.clientName,
        ]
          .join(" ")
          .toLocaleLowerCase("es-CR");
        if (!searchableText.includes(normalizedSearch)) return false;
      }
      return true;
    });
  }, [appointments, dateFilter, search, statusFilter]);

  return (
    <section className="mt-8 rounded-2xl border border-[#e2eae4] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
            RESERVAS
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Solicitudes de cita
          </h2>
        </div>
        <p className="text-sm text-[#71817c]">
          {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
        </p>
      </div>

      {appointments.length === 0 ? (
        <p className="mt-5 rounded-xl bg-[#f7f9f6] p-4 text-sm text-[#71817c]">
          Cuando tus clientes soliciten una cita, aparecerá aquí.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 rounded-xl bg-[#f7f9f6] p-4 sm:grid-cols-[1.2fr_0.8fr_1fr]">
            <label className="block space-y-1.5 text-xs font-medium text-[#52645d]">
              <span>Buscar</span>
              <input
                className="auth-input h-10"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cliente, servicio o profesional"
                type="search"
                value={search}
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium text-[#52645d]">
              <span>Estado</span>
              <select
                className="auth-input h-10"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="confirmed">Confirmadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="completed">Completadas</option>
                <option value="no_show">No asistió</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-xs font-medium text-[#52645d]">
              <span>Fecha local</span>
              <input
                className="auth-input h-10"
                onChange={(event) => setDateFilter(event.target.value)}
                type="date"
                value={dateFilter}
              />
            </label>
          </div>
          <p aria-live="polite" className="mt-4 text-xs text-[#829089]">
            Mostrando {filteredAppointments.length} de {appointments.length}{" "}
            citas
          </p>
          {filteredAppointments.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#dce5df] p-6 text-center">
              <p className="text-sm text-[#71817c]">
                No hay citas que coincidan con estos filtros.
              </p>
              <button
                className="mt-3 text-xs font-semibold text-[#34735e] hover:underline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
                type="button"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard
                  appointment={appointment}
                  key={appointment.id}
                  now={now}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function AppointmentCard({
  appointment,
  now,
}: {
  appointment: OwnerAppointment;
  now: Date;
}) {
  const start = new Intl.DateTimeFormat("es-CR", {
    timeZone: appointment.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(appointment.startsAt);
  const end = new Intl.DateTimeFormat("es-CR", {
    timeZone: appointment.timeZone,
    timeStyle: "short",
  }).format(appointment.endsAt);

  return (
    <article className="rounded-xl border border-[#e6ede8] bg-[#fbfcfa] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{appointment.serviceName}</p>
          <p className="mt-1 text-sm text-[#52645d]">
            {start} – {end}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${appointment.status === "pending" ? "bg-[#fff5e8] text-[#99621f]" : appointment.status === "confirmed" ? "bg-[#edf7ef] text-[#34735e]" : "bg-[#f1f2f1] text-[#7b8782]"}`}
        >
          {statusLabels[appointment.status]}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-xs text-[#71817c] sm:grid-cols-3">
        <p>
          Cliente:{" "}
          <span className="font-medium text-[#52645d]">
            {appointment.clientName}
          </span>
        </p>
        <p>
          Profesional:{" "}
          <span className="font-medium text-[#52645d]">
            {appointment.professionalName}
          </span>
        </p>
        <p>
          Negocio:{" "}
          <span className="font-medium text-[#52645d]">
            {appointment.businessName}
          </span>
        </p>
      </div>
      {appointment.notes && (
        <p className="mt-3 rounded-lg bg-white p-3 text-sm text-[#52645d]">
          {appointment.notes}
        </p>
      )}
      {appointment.status === "pending" && (
        <AppointmentStatusButtons
          appointmentId={appointment.id}
          status="pending"
          canMarkOutcome={false}
        />
      )}
      {appointment.status === "confirmed" && (
        <AppointmentStatusButtons
          appointmentId={appointment.id}
          status="confirmed"
          canMarkOutcome={appointment.endsAt.getTime() <= now.getTime()}
        />
      )}
      <BusinessPaymentManager
        payments={appointment.payments}
        timeZone={appointment.timeZone}
      />
    </article>
  );
}
