import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { BusinessForm } from "@/features/businesses/components/business-form";
import { BusinessProfileForm } from "@/features/businesses/components/business-profile-form";
import { ServiceManager } from "@/features/services/components/service-manager";
import { ScheduleForm } from "@/features/working-hours/components/schedule-form";
import { AppointmentManager } from "@/features/appointments/components/appointment-manager";
import { AppointmentCalendar } from "@/features/appointments/components/appointment-calendar";
import { MyAppointments } from "@/features/appointments/components/my-appointments";
import { TimeOffManager } from "@/features/time-off/components/time-off-manager";
import { getLocalDateForInstant } from "@/features/availability/availability";
import { TeamManager } from "@/features/staff/components/team-manager";
import { DashboardMetrics } from "@/features/dashboard/components/dashboard-metrics";

export const metadata = {
  title: "Tu espacio",
};

export default function HomeDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  await connection();
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/iniciar-sesion");
  }

  const { getBusinessDashboardMetrics } =
    await import("@/features/dashboard/queries");
  const { db } = await import("@/db");
  const {
    appointments,
    businesses,
    payments,
    services,
    staff,
    staffInvitations,
    staffServices,
    timeOff,
    user,
    workingHours,
  } = await import("@/db/schema");
  const { and, asc, desc, eq, gt, inArray, or } = await import("drizzle-orm");
  const currentTime = new Date();
  const ownedBusinesses = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      ownerId: businesses.ownerId,
      slug: businesses.slug,
      phone: businesses.phone,
      whatsapp: businesses.whatsapp,
      timezone: businesses.timezone,
    })
    .from(businesses)
    .where(eq(businesses.ownerId, session.user.id));
  const businessMetrics = await getBusinessDashboardMetrics(
    ownedBusinesses.map(({ id }) => id),
    currentTime,
  );
  const metricsByBusinessId = new Map(
    businessMetrics.map((metrics) => [metrics.businessId, metrics]),
  );
  const ownStaffMemberships = await db
    .select({
      id: staff.id,
      businessId: businesses.id,
      businessName: businesses.name,
      timezone: businesses.timezone,
      displayName: staff.displayName,
      active: staff.active,
    })
    .from(staff)
    .innerJoin(businesses, eq(staff.businessId, businesses.id))
    .where(and(eq(staff.userId, session.user.id), eq(staff.active, true)));
  const ownedServices = ownedBusinesses.length
    ? await db
        .select({
          id: services.id,
          businessId: services.businessId,
          name: services.name,
          durationMinutes: services.durationMinutes,
          priceCrc: services.priceCrc,
          active: services.active,
        })
        .from(services)
        .where(
          inArray(
            services.businessId,
            ownedBusinesses.map(({ id }) => id),
          ),
        )
    : [];
  const businessTeamMembers = ownedBusinesses.length
    ? await db
        .select({
          id: staff.id,
          businessId: staff.businessId,
          userId: staff.userId,
          displayName: staff.displayName,
          email: user.email,
          active: staff.active,
        })
        .from(staff)
        .innerJoin(user, eq(staff.userId, user.id))
        .where(
          inArray(
            staff.businessId,
            ownedBusinesses.map(({ id }) => id),
          ),
        )
    : [];
  const businessInvitations = ownedBusinesses.length
    ? await db
        .select({
          id: staffInvitations.id,
          businessId: staffInvitations.businessId,
          email: staffInvitations.email,
          expiresAt: staffInvitations.expiresAt,
          acceptedAt: staffInvitations.acceptedAt,
          revokedAt: staffInvitations.revokedAt,
        })
        .from(staffInvitations)
        .where(
          inArray(
            staffInvitations.businessId,
            ownedBusinesses.map(({ id }) => id),
          ),
        )
    : [];
  const businessStaffIds = Array.from(
    new Set([
      ...businessTeamMembers.map(({ id }) => id),
      ...ownStaffMemberships.map(({ id }) => id),
    ]),
  );
  const canCreateBusiness =
    ownedBusinesses.length === 0 && ownStaffMemberships.length === 0;
  const isProfessionalOnly =
    ownedBusinesses.length === 0 && ownStaffMemberships.length > 0;
  const businessAssignments = businessStaffIds.length
    ? await db
        .select({
          staffId: staffServices.staffId,
          serviceId: staffServices.serviceId,
        })
        .from(staffServices)
        .where(inArray(staffServices.staffId, businessStaffIds))
    : [];
  const businessSchedules = businessStaffIds.length
    ? await db
        .select({
          staffId: workingHours.staffId,
          weekday: workingHours.weekday,
          startTime: workingHours.startTime,
          endTime: workingHours.endTime,
        })
        .from(workingHours)
        .where(inArray(workingHours.staffId, businessStaffIds))
    : [];
  const businessAbsences = businessStaffIds.length
    ? await db
        .select({
          id: timeOff.id,
          staffId: timeOff.staffId,
          startsAt: timeOff.startsAt,
          endsAt: timeOff.endsAt,
          reason: timeOff.reason,
        })
        .from(timeOff)
        .where(inArray(timeOff.staffId, businessStaffIds))
    : [];
  const visibleBusinessIds = ownedBusinesses.map(({ id }) => id);
  const ownStaffIds = ownStaffMemberships.map(({ id }) => id);
  const ownerAppointments =
    visibleBusinessIds.length || ownStaffIds.length
      ? await db
          .select({
            id: appointments.id,
            businessId: appointments.businessId,
            businessName: businesses.name,
            timeZone: businesses.timezone,
            serviceName: services.name,
            professionalName: staff.displayName,
            clientName: user.name,
            startsAt: appointments.startsAt,
            endsAt: appointments.endsAt,
            status: appointments.status,
            notes: appointments.notes,
          })
          .from(appointments)
          .innerJoin(businesses, eq(appointments.businessId, businesses.id))
          .innerJoin(services, eq(appointments.serviceId, services.id))
          .innerJoin(staff, eq(appointments.staffId, staff.id))
          .innerJoin(user, eq(appointments.clientId, user.id))
          .where(
            or(
              ...(visibleBusinessIds.length
                ? [inArray(appointments.businessId, visibleBusinessIds)]
                : []),
              ...(ownStaffIds.length
                ? [inArray(appointments.staffId, ownStaffIds)]
                : []),
            ),
          )
          .orderBy(asc(appointments.startsAt))
          .limit(50)
      : [];
  const clientAppointments = await db
    .select({
      id: appointments.id,
      businessName: businesses.name,
      timeZone: businesses.timezone,
      serviceName: services.name,
      professionalName: staff.displayName,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
    })
    .from(appointments)
    .innerJoin(businesses, eq(appointments.businessId, businesses.id))
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .innerJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.clientId, session.user.id),
        gt(
          appointments.startsAt,
          new Date(currentTime.getTime() - 30 * 24 * 60 * 60 * 1_000),
        ),
      ),
    )
    .orderBy(asc(appointments.startsAt))
    .limit(50);
  const ownerAppointmentIds = ownerAppointments.map(({ id }) => id);
  const clientAppointmentIds = clientAppointments.map(({ id }) => id);
  const ownerPayments = ownerAppointmentIds.length
    ? await db
        .select({
          id: payments.id,
          appointmentId: payments.appointmentId,
          amountCrc: payments.amountCrc,
          reference: payments.reference,
          status: payments.status,
          reviewNote: payments.reviewNote,
          createdAt: payments.createdAt,
          reporterName: user.name,
        })
        .from(payments)
        .innerJoin(user, eq(payments.reportedBy, user.id))
        .where(inArray(payments.appointmentId, ownerAppointmentIds))
        .orderBy(desc(payments.createdAt))
    : [];
  const clientPayments = clientAppointmentIds.length
    ? await db
        .select({
          id: payments.id,
          appointmentId: payments.appointmentId,
          amountCrc: payments.amountCrc,
          reference: payments.reference,
          status: payments.status,
          reviewNote: payments.reviewNote,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(inArray(payments.appointmentId, clientAppointmentIds))
        .orderBy(desc(payments.createdAt))
    : [];

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#172b27]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          aria-label="AgendaCR, inicio"
          className="flex items-center"
        >
          <BrandLogo className="h-8 w-auto sm:h-9" />
        </Link>
        <SignOutButton />
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10 sm:pt-16">
        <p className="text-sm font-medium text-[#34735e]">
          TU ESPACIO DE TRABAJO
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Hola, {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-[#52645d]">
          {ownedBusinesses.length === 0
            ? ownStaffMemberships.length > 0
              ? "Aquí puedes revisar tus citas y administrar tu disponibilidad profesional."
              : "Empecemos por lo esencial: registra tu negocio para preparar tu agenda."
            : "Administra los datos de tu negocio y continúa preparando tu agenda."}
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-[#e2eae4] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#34735e]">
              {canCreateBusiness
                ? "PRIMER PASO"
                : ownedBusinesses.length > 0
                  ? "NEGOCIO"
                  : "TU EQUIPO"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {canCreateBusiness
                ? "Registra tu negocio"
                : ownedBusinesses.length > 0
                  ? "Tus negocios"
                  : "Tu agenda profesional"}
            </h2>
            {ownedBusinesses.length > 0 && (
              <div className="mt-5 space-y-3">
                {ownedBusinesses.map((business) => (
                  <BusinessProfileForm business={business} key={business.id} />
                ))}
              </div>
            )}
            {canCreateBusiness && <BusinessForm />}
          </section>

          <section className="rounded-2xl bg-[#163e35] p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9e6c9]">
              {isProfessionalOnly ? "TU AGENDA" : "DESPUÉS"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {isProfessionalOnly
                ? "Tu espacio profesional"
                : "Tu agenda toma forma"}
            </h2>
            <div className="mt-6 space-y-5">
              {isProfessionalOnly ? (
                <>
                  <SetupStep
                    number="01"
                    title="Revisa tus citas"
                    text="Consulta las solicitudes y actualiza el estado de tus reservas."
                  />
                  <SetupStep
                    number="02"
                    title="Mantén tu horario al día"
                    text="Los espacios disponibles se calculan con tu horario semanal."
                  />
                  <SetupStep
                    number="03"
                    title="Registra tus ausencias"
                    text="Bloquea con tiempo los días en que no podrás atender."
                  />
                </>
              ) : (
                <>
                  <SetupStep
                    number="02"
                    title="Agrega tus servicios"
                    text="Define qué ofreces, cuánto dura y cuál es el precio."
                  />
                  <SetupStep
                    number="03"
                    title="Configura tus horarios"
                    text="Indica cuándo puedes recibir clientes."
                  />
                  <SetupStep
                    number="04"
                    title="Invita a tu equipo"
                    text="Cada profesional puede gestionar su propia agenda."
                  />
                </>
              )}
            </div>
          </section>
        </div>

        <DashboardMetrics
          businesses={ownedBusinesses.map((business) => ({
            id: business.id,
            name: business.name,
            metrics: metricsByBusinessId.get(business.id) ?? {
              pendingAppointments: 0,
              upcomingAppointments: 0,
              completedAppointments: 0,
              completedServiceValueCrc: "0",
            },
          }))}
        />

        {ownedBusinesses.map((business) => (
          <AppointmentCalendar
            businessId={business.id}
            businessName={business.name}
            key={`calendar-${business.id}`}
            timeZone={business.timezone}
            workingHours={businessSchedules.filter(
              ({ staffId }) =>
                businessTeamMembers.some(
                  (professional) =>
                    professional.id === staffId &&
                    professional.businessId === business.id &&
                    professional.active,
                ) ||
                ownStaffMemberships.some(
                  (professional) =>
                    professional.id === staffId &&
                    professional.businessId === business.id &&
                    professional.active,
                ),
            )}
          />
        ))}

        {ownStaffMemberships
          .filter(
            (professional) =>
              professional.active &&
              !visibleBusinessIds.includes(professional.businessId),
          )
          .map((professional) => (
            <AppointmentCalendar
              businessId={professional.businessId}
              businessName={professional.businessName}
              key={`calendar-${professional.id}`}
              staffId={professional.id}
              timeZone={professional.timezone}
              workingHours={businessSchedules.filter(
                (hours) => hours.staffId === professional.id,
              )}
            />
          ))}

        <MyAppointments
          appointments={clientAppointments.map((appointment) => ({
            ...appointment,
            payments: clientPayments.filter(
              (payment) => payment.appointmentId === appointment.id,
            ),
          }))}
          now={currentTime}
        />

        {ownedBusinesses.map((business) => (
          <TeamManager
            key={business.id}
            businessId={business.id}
            team={businessTeamMembers
              .filter((member) => member.businessId === business.id)
              .map((member) => ({
                id: member.id,
                displayName: member.displayName,
                email: member.email,
                active: member.active,
                isOwner: member.userId === business.ownerId,
                services: ownedServices
                  .filter((service) => service.businessId === business.id)
                  .map((service) => ({
                    ...service,
                    assigned: businessAssignments.some(
                      (assignment) =>
                        assignment.staffId === member.id &&
                        assignment.serviceId === service.id,
                    ),
                  })),
              }))}
            invitations={businessInvitations.filter(
              (invitation) => invitation.businessId === business.id,
            )}
            now={currentTime}
          />
        ))}

        {ownedBusinesses.map((business) => (
          <ServiceManager
            key={business.id}
            businessId={business.id}
            services={ownedServices.filter(
              (service) => service.businessId === business.id,
            )}
          />
        ))}

        {ownedBusinesses.flatMap((business) =>
          businessTeamMembers
            .filter(
              (professional) =>
                professional.businessId === business.id && professional.active,
            )
            .map((professional) => (
              <ScheduleForm
                key={`schedule-${professional.id}`}
                businessId={business.id}
                staffId={professional.id}
                professionalName={professional.displayName}
                schedule={businessSchedules.filter(
                  (hours) => hours.staffId === professional.id,
                )}
              />
            )),
        )}

        {ownStaffMemberships
          .filter(
            (professional) =>
              professional.active &&
              !visibleBusinessIds.includes(professional.businessId),
          )
          .map((professional) => (
            <ScheduleForm
              key={`schedule-${professional.id}`}
              businessId={professional.businessId}
              staffId={professional.id}
              professionalName={professional.displayName}
              schedule={businessSchedules.filter(
                (hours) => hours.staffId === professional.id,
              )}
            />
          ))}

        {ownedBusinesses.flatMap((business) =>
          businessTeamMembers
            .filter(
              (professional) =>
                professional.businessId === business.id && professional.active,
            )
            .map((professional) => (
              <TimeOffManager
                key={`time-off-${professional.id}`}
                businessId={business.id}
                staffId={professional.id}
                professionalName={professional.displayName}
                timeZone={business.timezone}
                today={
                  getLocalDateForInstant(currentTime, business.timezone) ??
                  currentTime.toISOString().slice(0, 10)
                }
                absences={businessAbsences.filter(
                  (absence) => absence.staffId === professional.id,
                )}
              />
            )),
        )}

        {ownStaffMemberships
          .filter(
            (professional) =>
              professional.active &&
              !visibleBusinessIds.includes(professional.businessId),
          )
          .map((professional) => (
            <TimeOffManager
              key={`time-off-${professional.id}`}
              businessId={professional.businessId}
              staffId={professional.id}
              professionalName={professional.displayName}
              timeZone={professional.timezone}
              today={
                getLocalDateForInstant(currentTime, professional.timezone) ??
                currentTime.toISOString().slice(0, 10)
              }
              absences={businessAbsences.filter(
                (absence) => absence.staffId === professional.id,
              )}
            />
          ))}

        <AppointmentManager
          appointments={ownerAppointments.map((appointment) => ({
            ...appointment,
            payments: ownerPayments.filter(
              (payment) => payment.appointmentId === appointment.id,
            ),
          }))}
          now={currentTime}
        />

        <p className="mt-8 text-sm text-[#52645d]">
          Sesión iniciada como{" "}
          <span className="font-medium text-[#52645d]">
            {session.user.email}
          </span>
        </p>
      </section>
    </main>
  );
}

function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-6 py-16 text-[#52645d] sm:px-10">
      Cargando tu espacio de trabajo…
    </main>
  );
}

function SetupStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-xs font-semibold text-[#b9e6c9]">
        {number}
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-white/65">{text}</p>
      </div>
    </div>
  );
}
