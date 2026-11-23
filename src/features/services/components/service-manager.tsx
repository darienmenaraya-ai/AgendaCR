"use client";

import { useActionState } from "react";

import {
  saveServiceAction,
  setServiceActiveAction,
  type ServiceActionState,
} from "@/features/services/actions";

type ServiceSummary = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCrc: number;
  active: boolean;
};

type ServiceManagerProps = {
  businessId: string;
  services: ServiceSummary[];
};

const initialState: ServiceActionState = { error: null, success: null };
const priceFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export function ServiceManager({ businessId, services }: ServiceManagerProps) {
  const activeCount = services.filter((service) => service.active).length;

  return (
    <section className="mt-8 rounded-2xl border border-[#e2eae4] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
            SERVICIOS
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Lo que ofreces
          </h2>
        </div>
        <p className="text-sm text-[#52645d]">
          {activeCount} {activeCount === 1 ? "activo" : "activos"}
        </p>
      </div>

      {services.length > 0 && (
        <div className="mt-6 space-y-4">
          {services.map((service) => (
            <ServiceEditor
              key={service.id}
              businessId={businessId}
              service={service}
            />
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-[#edf1ed] pt-6">
        <h3 className="font-semibold">Agregar servicio</h3>
        <ServiceForm businessId={businessId} />
      </div>
    </section>
  );
}

function ServiceEditor({
  businessId,
  service,
}: {
  businessId: string;
  service: ServiceSummary;
}) {
  const [state, action, isPending] = useActionState(
    saveServiceAction,
    initialState,
  );
  const [statusState, statusAction, isStatusPending] = useActionState(
    setServiceActiveAction,
    initialState,
  );

  return (
    <article className="rounded-xl border border-[#e6ede8] bg-[#fbfcfa] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-semibold">{service.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${service.active ? "bg-[#edf7ef] text-[#34735e]" : "bg-[#f1f2f1] text-[#52645d]"}`}
          >
            {service.active ? "Activo" : "Inactivo"}
          </span>
        </div>
        <form action={statusAction}>
          <input name="businessId" type="hidden" value={businessId} />
          <input name="serviceId" type="hidden" value={service.id} />
          <input name="active" type="hidden" value={String(!service.active)} />
          <button
            className="text-xs font-semibold text-[#34735e] hover:underline disabled:opacity-50"
            disabled={isStatusPending}
            type="submit"
          >
            {isStatusPending
              ? "Actualizando…"
              : service.active
                ? "Desactivar"
                : "Activar"}
          </button>
        </form>
      </div>
      <ServiceFields
        action={action}
        businessId={businessId}
        isPending={isPending}
        service={service}
        state={state}
        submitLabel="Guardar cambios"
      />
      {statusState.error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {statusState.error}
        </p>
      )}
    </article>
  );
}

function ServiceForm({ businessId }: { businessId: string }) {
  const [state, action, isPending] = useActionState(
    saveServiceAction,
    initialState,
  );

  return (
    <ServiceFields
      action={action}
      businessId={businessId}
      isPending={isPending}
      state={state}
      submitLabel="Agregar servicio"
    />
  );
}

function ServiceFields({
  action,
  businessId,
  isPending,
  service,
  state,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  businessId: string;
  isPending: boolean;
  service?: ServiceSummary;
  state: ServiceActionState;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <input name="businessId" type="hidden" value={businessId} />
      <input name="serviceId" type="hidden" value={service?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-[1.5fr_0.8fr_1fr]">
        <label className="block space-y-2 text-sm font-medium">
          <span>Nombre</span>
          <input
            className="auth-input"
            defaultValue={service?.name ?? ""}
            maxLength={100}
            minLength={2}
            name="name"
            placeholder="Corte de cabello"
            required
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Duración (min)</span>
          <input
            className="auth-input"
            defaultValue={service?.durationMinutes ?? 30}
            max={480}
            min={5}
            name="durationMinutes"
            required
            step={1}
            type="number"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Precio (₡)</span>
          <input
            className="auth-input"
            defaultValue={service?.priceCrc ?? 0}
            max={10_000_000}
            min={0}
            name="priceCrc"
            required
            step={1}
            type="number"
          />
        </label>
      </div>
      {state.error && (
        <p aria-live="polite" className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p aria-live="polite" className="text-sm text-[#34735e]" role="status">
          {state.success}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {service && (
          <p className="text-xs text-[#52645d]">
            {service.durationMinutes} min ·{" "}
            {priceFormatter.format(service.priceCrc)}
          </p>
        )}
        <button
          className="flex h-10 items-center justify-center rounded-xl bg-[#1e5949] px-4 text-sm font-semibold text-white transition hover:bg-[#17483b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e5949] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
