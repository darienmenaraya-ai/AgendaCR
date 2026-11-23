import type { BusinessPaymentRecord } from "@/features/payments/types";
import { PaymentReviewActions } from "@/features/payments/components/payment-review-actions";

const statusLabels = {
  reported: "En revisión",
  verified: "Verificado",
  rejected: "Rechazado",
} satisfies Record<BusinessPaymentRecord["status"], string>;

const currencyFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export function BusinessPaymentManager({
  payments,
  timeZone,
}: {
  payments: BusinessPaymentRecord[];
  timeZone: string;
}) {
  if (payments.length === 0) return null;

  return (
    <section className="mt-4 border-t border-[#e6ede8] pt-4">
      <h3 className="text-sm font-semibold text-[#35554c]">
        Reportes SINPE Móvil ({payments.length})
      </h3>
      <ul className="mt-3 space-y-3">
        {payments.map((payment) => (
          <li className="rounded-lg bg-white p-3" key={payment.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#172b27]">
                {currencyFormatter.format(payment.amountCrc)}
              </span>
              <span className="text-xs text-[#52645d]">
                {statusLabels[payment.status]}
              </span>
            </div>
            <p className="mt-1 break-all text-xs text-[#52645d]">
              Referencia: {payment.reference}
            </p>
            <p className="mt-1 text-xs text-[#52645d]">
              Reportado por {payment.reporterName} ·{" "}
              {new Intl.DateTimeFormat("es-CR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone,
              }).format(payment.createdAt)}
            </p>
            {payment.reviewNote && (
              <p className="mt-2 rounded-md bg-[#fff6f4] p-2 text-xs text-[#9a5147]">
                Motivo del rechazo: {payment.reviewNote}
              </p>
            )}
            {payment.status === "reported" && (
              <PaymentReviewActions paymentId={payment.id} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
