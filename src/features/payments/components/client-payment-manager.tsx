"use client";

import { ReportSinpePaymentForm } from "@/features/payments/components/report-sinpe-payment-form";
import type { PaymentRecord } from "@/features/payments/types";

const statusLabels = {
  reported: "En revisión",
  verified: "Verificado",
  rejected: "Rechazado",
} satisfies Record<PaymentRecord["status"], string>;

const currencyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export function ClientPaymentManager({
  appointmentId,
  canReport,
  payments,
  timeZone,
}: {
  appointmentId: string;
  canReport: boolean;
  payments: PaymentRecord[];
  timeZone: string;
}) {
  return (
    <section className="mt-4 border-t border-[#e6ede8] pt-4">
      <h3 className="text-sm font-semibold text-[#35554c]">
        Pagos por SINPE Móvil
      </h3>
      <p className="mt-1 text-xs leading-5 text-[#71817c]">
        Envía el dinero desde tu aplicación bancaria y reporta aquí el monto y
        la referencia. El negocio debe verificar el pago.
      </p>

      {payments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {payments.map((payment) => (
            <li className="rounded-lg bg-white p-3 text-xs" key={payment.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#35554c]">
                  {currencyFormatter.format(payment.amountCrc)}
                </span>
                <span className="text-[#71817c]">
                  {statusLabels[payment.status]}
                </span>
              </div>
              <p className="mt-1 break-all text-[#71817c]">
                Referencia: {payment.reference}
              </p>
              <p className="mt-1 text-[#829089]">
                Reportado el{" "}
                {new Intl.DateTimeFormat("es-CR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone,
                }).format(payment.createdAt)}
              </p>
              {payment.status === "rejected" && payment.reviewNote && (
                <p className="mt-2 rounded-md bg-[#fff6f4] p-2 text-[#9a5147]">
                  Motivo: {payment.reviewNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canReport && <ReportSinpePaymentForm appointmentId={appointmentId} />}
    </section>
  );
}
