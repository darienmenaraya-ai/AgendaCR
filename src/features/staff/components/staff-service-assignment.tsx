"use client";

import { useActionState } from "react";

import {
  updateStaffServiceAction,
  type StaffActionState,
} from "@/features/staff/actions";

const initialState: StaffActionState = { error: null, success: null };

export type StaffServiceSummary = {
  id: string;
  name: string;
  active: boolean;
  assigned: boolean;
};

export function StaffServiceAssignment({
  businessId,
  staffId,
  professionalName,
  services,
}: {
  businessId: string;
  staffId: string;
  professionalName: string;
  services: StaffServiceSummary[];
}) {
  const [state, action, isPending] = useActionState(
    updateStaffServiceAction,
    initialState,
  );

  return (
    <div className="mt-4 border-t border-[#edf1ed] pt-4">
      <h4 className="text-sm font-semibold">Servicios de {professionalName}</h4>
      {services.length === 0 ? (
        <p className="mt-2 text-sm text-[#52645d]">
          Agrega servicios al negocio para poder asignarlos.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {services.map((service) => (
            <form action={action} className="inline-flex" key={service.id}>
              <input name="businessId" type="hidden" value={businessId} />
              <input name="staffId" type="hidden" value={staffId} />
              <input name="serviceId" type="hidden" value={service.id} />
              <input
                name="assigned"
                type="hidden"
                value={service.assigned ? "false" : "true"}
              />
              <button
                aria-label={`${service.assigned ? "Quitar" : "Asignar"} ${service.name} ${service.assigned ? "de" : "a"} ${professionalName}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${service.assigned ? "border-[#b8dbc4] bg-[#edf7ef] text-[#28624c]" : "border-[#e2eae4] bg-white text-[#61716b] hover:border-[#a9cbb4]"}`}
                disabled={isPending || (!service.active && !service.assigned)}
                type="submit"
              >
                {service.assigned ? "✓ " : "+ "}
                {service.name}
              </button>
            </form>
          ))}
        </div>
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
  );
}
