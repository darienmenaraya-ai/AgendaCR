type DashboardMetricsProps = {
  businesses: {
    id: string;
    name: string;
    metrics: {
      pendingAppointments: number;
      upcomingAppointments: number;
      completedAppointments: number;
      completedServiceValueCrc: string;
    };
  }[];
};

const crcFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export function DashboardMetrics({ businesses }: DashboardMetricsProps) {
  if (businesses.length === 0) return null;

  return (
    <section aria-labelledby="dashboard-metrics-title" className="mt-8">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
          RESUMEN
        </p>
        <h2
          className="mt-2 text-2xl font-semibold tracking-tight"
          id="dashboard-metrics-title"
        >
          Así va tu agenda
        </h2>
        <p className="mt-1 text-sm text-[#71817c]">
          Actividad actual y de los últimos 30 días.
        </p>
      </div>

      <div className="space-y-6">
        {businesses.map(({ id, name, metrics }) => (
          <section aria-labelledby={`business-metrics-${id}`} key={id}>
            <h3
              className="mb-3 text-sm font-semibold text-[#52645d]"
              id={`business-metrics-${id}`}
            >
              {name}
            </h3>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Solicitudes pendientes"
                value={metrics.pendingAppointments.toLocaleString("es-CR")}
              />
              <Metric
                label="Confirmadas en 7 días"
                value={metrics.upcomingAppointments.toLocaleString("es-CR")}
              />
              <Metric
                label="Completadas en 30 días"
                value={metrics.completedAppointments.toLocaleString("es-CR")}
              />
              <Metric
                label="Valor de servicios completados"
                value={crcFormatter.format(
                  BigInt(metrics.completedServiceValueCrc),
                )}
              />
            </dl>
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs text-[#829089]">
        El valor de servicios no representa pagos recibidos; los pagos se
        incorporarán en una fase posterior.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e2eae4] bg-white p-5 shadow-sm">
      <dt className="text-xs font-medium text-[#71817c]">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold tabular-nums text-[#172b27]">
        {value}
      </dd>
    </div>
  );
}
