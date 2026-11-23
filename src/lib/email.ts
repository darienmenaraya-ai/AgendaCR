type AppointmentEmailContext = {
  appointmentId: string;
  businessName: string;
  clientName: string;
  professionalName: string;
  serviceName: string;
  startsAt: Date;
  timeZone: string;
};

type EmailDetail = { label: string; value: string; href?: string };

export type StaffInvitationEmailResult = "sent" | "failed" | "not-configured";

export async function sendStaffInvitationNotification({
  to,
  businessName,
  inviterName,
  inviteUrl,
  expiresAt,
  idempotencyKey,
}: {
  to: string;
  businessName: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
  idempotencyKey: string;
}): Promise<StaffInvitationEmailResult> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return "not-configured";
  }

  const sent = await sendSafely({
    to,
    subject: `Invitación para unirte a ${businessName} · AgendaCR`,
    idempotencyKey: `staff-invitation/${idempotencyKey}`,
    heading: `Únete a ${businessName}`,
    introduction: `${inviterName} te invitó a formar parte del equipo de ${businessName} en AgendaCR. Acepta la invitación con el correo al que se envió este mensaje.`,
    details: [
      { label: "Negocio", value: businessName },
      {
        label: "Aceptar invitación",
        value: inviteUrl,
        href: inviteUrl,
      },
      {
        label: "Vence",
        value: new Intl.DateTimeFormat("es-CR", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: process.env.APP_TIMEZONE ?? "America/Costa_Rica",
        }).format(expiresAt),
      },
    ],
  });

  return sent ? "sent" : "failed";
}

export async function sendAppointmentRequestNotifications(
  context: AppointmentEmailContext & {
    clientEmail: string;
    businessOwnerEmail: string;
  },
): Promise<void> {
  const appointmentDate = formatAppointmentDate(
    context.startsAt,
    context.timeZone,
  );

  await Promise.all([
    sendSafely({
      to: context.clientEmail,
      subject: `Solicitud de cita recibida · ${context.businessName}`,
      idempotencyKey: `appointment/${context.appointmentId}/request/client`,
      heading: "Recibimos tu solicitud",
      introduction: `Hola ${context.clientName}, el negocio debe confirmar tu cita. Te avisaremos cuando actualice la solicitud.`,
      details: [
        { label: "Negocio", value: context.businessName },
        { label: "Servicio", value: context.serviceName },
        { label: "Profesional", value: context.professionalName },
        { label: "Fecha y hora", value: appointmentDate },
        { label: "Estado", value: "Pendiente de confirmación" },
      ],
    }),
    sendSafely({
      to: context.businessOwnerEmail,
      subject: `Nueva solicitud de cita · ${context.businessName}`,
      idempotencyKey: `appointment/${context.appointmentId}/request/business`,
      heading: "Tienes una nueva solicitud",
      introduction: `${context.clientName} solicitó una cita. Revisa la agenda para confirmarla o cancelarla.`,
      details: [
        { label: "Cliente", value: context.clientName },
        { label: "Servicio", value: context.serviceName },
        { label: "Profesional", value: context.professionalName },
        { label: "Fecha y hora", value: appointmentDate },
      ],
    }),
  ]);
}

export async function sendAppointmentStatusNotification(
  context: AppointmentEmailContext & {
    clientEmail: string;
    status: "confirmed" | "cancelled";
  },
): Promise<void> {
  const isConfirmed = context.status === "confirmed";
  await sendSafely({
    to: context.clientEmail,
    subject: `${isConfirmed ? "Cita confirmada" : "Cita cancelada"} · ${context.businessName}`,
    idempotencyKey: `appointment/${context.appointmentId}/${context.status}/client`,
    heading: isConfirmed ? "Tu cita está confirmada" : "Tu cita fue cancelada",
    introduction: isConfirmed
      ? `Hola ${context.clientName}, el negocio confirmó tu cita.`
      : `Hola ${context.clientName}, el negocio canceló tu cita. Puedes volver a reservar otro horario si lo necesitas.`,
    details: [
      { label: "Negocio", value: context.businessName },
      { label: "Servicio", value: context.serviceName },
      { label: "Profesional", value: context.professionalName },
      {
        label: "Fecha y hora",
        value: formatAppointmentDate(context.startsAt, context.timeZone),
      },
      { label: "Estado", value: isConfirmed ? "Confirmada" : "Cancelada" },
    ],
  });
}

export async function sendClientCancellationNotification(
  context: AppointmentEmailContext & { businessOwnerEmail: string },
): Promise<void> {
  await sendSafely({
    to: context.businessOwnerEmail,
    subject: `Cita cancelada por el cliente · ${context.businessName}`,
    idempotencyKey: `appointment/${context.appointmentId}/cancelled/business`,
    heading: "Un cliente canceló una cita",
    introduction: `${context.clientName} canceló una cita de su agenda.`,
    details: [
      { label: "Servicio", value: context.serviceName },
      { label: "Profesional", value: context.professionalName },
      {
        label: "Fecha y hora",
        value: formatAppointmentDate(context.startsAt, context.timeZone),
      },
    ],
  });
}

export async function sendAppointmentReminderNotification(
  context: AppointmentEmailContext & { clientEmail: string },
): Promise<void> {
  await sendSafely({
    to: context.clientEmail,
    subject: `Recordatorio de tu cita · ${context.businessName}`,
    idempotencyKey: `appointment/${context.appointmentId}/reminder/24h/client`,
    heading: "Tu cita es mañana",
    introduction: `Hola ${context.clientName}, te recordamos que tienes una cita confirmada.`,
    details: [
      { label: "Negocio", value: context.businessName },
      { label: "Servicio", value: context.serviceName },
      { label: "Profesional", value: context.professionalName },
      {
        label: "Fecha y hora",
        value: formatAppointmentDate(context.startsAt, context.timeZone),
      },
    ],
  });
}

async function sendSafely(
  message: Parameters<typeof sendTransactionalEmail>[0],
): Promise<boolean> {
  try {
    return await sendTransactionalEmail(message);
  } catch (error) {
    console.error(
      "No se pudo enviar una notificación de cita por correo.",
      error,
    );
    return false;
  }
}

async function sendTransactionalEmail({
  to,
  subject,
  idempotencyKey,
  heading,
  introduction,
  details,
}: {
  to: string;
  subject: string;
  idempotencyKey: string;
  heading: string;
  introduction: string;
  details: EmailDetail[];
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: renderEmailHtml(heading, introduction, details),
      text: renderEmailText(heading, introduction, details),
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Resend respondió con HTTP ${response.status}.`);
  }

  return true;
}

function renderEmailHtml(
  heading: string,
  introduction: string,
  details: EmailDetail[],
): string {
  const rows = details
    .map(
      ({ label, value, href }) =>
        `<tr><th align="left" style="padding:10px 12px;color:#52645d;font-size:13px;font-weight:500">${escapeHtml(label)}</th><td align="right" style="padding:10px 12px;color:#172b27;font-size:13px;font-weight:600;overflow-wrap:anywhere">${href ? `<a href="${escapeHtml(href)}" style="color:#1e5949">Abrir invitación</a>` : escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<div style="margin:0;background:#f7f8f5;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#172b27"><div style="max-width:560px;margin:0 auto;border:1px solid #e2eae4;border-radius:18px;background:#fff;padding:28px"><p style="margin:0;color:#34735e;font-size:12px;font-weight:700;letter-spacing:2px">AGENDA CR</p><h1 style="margin:18px 0 10px;font-size:24px;line-height:1.3">${escapeHtml(heading)}</h1><p style="margin:0;color:#52645d;font-size:15px;line-height:1.7">${escapeHtml(introduction)}</p><table role="presentation" style="width:100%;margin-top:22px;border-collapse:collapse">${rows}</table><p style="margin:24px 0 0;border-top:1px solid #edf1ed;padding-top:16px;color:#52645d;font-size:12px">Este mensaje fue enviado por AgendaCR.</p></div></div>`;
}

function renderEmailText(
  heading: string,
  introduction: string,
  details: EmailDetail[],
): string {
  return [
    heading,
    "",
    introduction,
    "",
    ...details.map(({ label, value }) => `${label}: ${value}`),
    "",
    "Este mensaje fue enviado por AgendaCR.",
  ].join("\n");
}

function formatAppointmentDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
