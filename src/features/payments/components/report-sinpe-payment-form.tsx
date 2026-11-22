"use client";

import { useActionState } from "react";

import {
  reportPaymentAction,
  type PaymentActionState,
} from "@/features/payments/actions";

const initialState: PaymentActionState = { error: null, success: null };

export function ReportSinpePaymentForm({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [state, action, isPending] = useActionState(
    reportPaymentAction,
    initialState,
  );

  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input name="appointmentId" type="hidden" value={appointmentId} />
      <label className="space-y-1.5 text-xs font-medium text-[#52645d]">
        <span>Monto enviado (₡)</span>
        <input
          autoComplete="off"
          className="auth-input h-10"
          inputMode="numeric"
          max="2147483647"
          min="1"
          name="amountCrc"
          placeholder="Ej. 5000"
          required
          step="1"
          type="number"
        />
      </label>
      <label className="space-y-1.5 text-xs font-medium text-[#52645d]">
        <span>Referencia SINPE</span>
        <input
          autoComplete="off"
          className="auth-input h-10"
          maxLength={100}
          minLength={3}
          name="reference"
          placeholder="Código del comprobante"
          required
          type="text"
        />
      </label>
      <div className="sm:col-span-2">
        <button
          className="h-10 rounded-lg bg-[#1e5949] px-4 text-xs font-semibold text-white transition hover:bg-[#17483b] disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Enviando…" : "Reportar pago"}
        </button>
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
    </form>
  );
}
