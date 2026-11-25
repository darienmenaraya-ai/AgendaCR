import { config } from "dotenv";

config({ path: ".env.local" });

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error(
    "Falta RESEND_API_KEY en .env.local. Crea una clave de envío en Resend y vuelve a intentarlo.",
  );
  process.exitCode = 1;
} else {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AgendaCR <onboarding@resend.dev>",
        to: ["delivered@resend.dev"],
        subject: "Prueba local de correo · AgendaCR",
        html: "<p>La conexión local de AgendaCR con Resend funciona.</p>",
        text: "La conexión local de AgendaCR con Resend funciona.",
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`Resend rechazó la prueba (HTTP ${response.status}).`);
      if (details) console.error(details);
      process.exitCode = 1;
    } else {
      const result = await response.json();
      console.log("Resend aceptó el correo de prueba.");
      console.log(`Id del correo: ${result.id}`);
      console.log("Destino simulado: delivered@resend.dev");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error de conexión desconocido.";
    console.error(`No se pudo conectar con Resend: ${message}`);
    process.exitCode = 1;
  }
}
