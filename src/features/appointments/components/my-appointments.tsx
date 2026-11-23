import { ClientCancelButton } from "@/features/appointments/components/client-cancel-button";
import { ClientPaymentManager } from "@/features/payments/components/client-payment-manager";
import type { PaymentRecord } from "@/features/payments/types";

type ClientAppointment = {
  id: string;
  businessName: string;
  timeZone: string;
  serviceName: string;
  professionalName: string;
  startsAt: Date;
  endsAt: Date;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  payments: PaymentRecord[];
};

const labels: Record<ClientAppointment["status"], string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asististe",
};

export function MyAppointments({
  appointments,
  now,
}: {
  appointments: ClientAppointment[];
  now: Date;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-[#e2eae4] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
          TU AGENDA
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Mis citas
        </h2>
      </div>

      {appointments.length === 0 ? (
        <p className="mt-5 rounded-xl bg-[#f7f9f6] p-4 text-sm text-[#52645d]">
          Todavía no tienes citas. Puedes reservar desde la página pública de un
          negocio.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {appointments.map((appointment) => {
            const startsAt = new Intl.DateTimeFormat("es-CR", {
              timeZone: appointment.timeZone,
              dateStyle: "medium",
              timeStyle: "short",
            }).format(appointment.startsAt);
            const endsAt = new Intl.DateTimeFormat("es-CR", {
              timeZone: appointment.timeZone,
              timeStyle: "short",
            }).format(appointment.endsAt);
            const canCancel =
              (appointment.status === "pending" ||
                appointment.status === "confirmed") &&
              appointment.startsAt.getTime() - now.getTime() >
                2 * 60 * 60 * 1_000;

            return (
              <article
                key={appointment.id}
                className="rounded-xl border border-[#e6ede8] bg-[#fbfcfa] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {appointment.serviceName}
                    </p>
                    <p className="mt-1 text-sm text-[#52645d]">
                      {startsAt} – {endsAt}
                    </p>
                    <p className="mt-1 text-xs text-[#52645d]">
                      {appointment.businessName} ·{" "}
                      {appointment.professionalName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${appointment.status === "pending" ? "bg-[#fff5e8] text-[#99621f]" : appointment.status === "confirmed" ? "bg-[#edf7ef] text-[#34735e]" : "bg-[#f1f2f1] text-[#52645d]"}`}
                  >
                    {labels[appointment.status]}
                  </span>
                </div>
                {canCancel ? (
                  <ClientCancelButton appointmentId={appointment.id} />
                ) : appointment.status === "pending" ||
                  appointment.status === "confirmed" ? (
                  <p className="mt-4 text-xs text-[#52645d]">
                    La cancelación en línea está disponible hasta 2 horas antes.
                  </p>
                ) : null}
                {appointment.status !== "cancelled" &&
                  appointment.status !== "no_show" && (
                    <ClientPaymentManager
                      appointmentId={appointment.id}
                      canReport
                      payments={appointment.payments}
                      timeZone={appointment.timeZone}
                    />
                  )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
