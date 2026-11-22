import { expect, test } from "@playwright/test";

test("la página principal ofrece acceso claro a registro e inicio de sesión", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /tu negocio fluye mejor/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Empieza a organizarte" }),
  ).toHaveAttribute("href", "/registro");
  await expect(
    page.getByRole("link", { name: "Ya tengo una cuenta" }),
  ).toHaveAttribute("href", "/iniciar-sesion");
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toHaveCSS(
    "white-space",
    "nowrap",
  );
});

test("los formularios de acceso tienen campos con etiquetas accesibles", async ({
  page,
}) => {
  await page.goto("/iniciar-sesion");

  await expect(
    page.getByRole("heading", { name: "Inicia sesión" }),
  ).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();

  await page.goto("/registro");

  await expect(page.getByLabel("Nombre completo")).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});

test("rechaza un correo inválido antes de llamar al servidor", async ({
  page,
}) => {
  let authRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/sign-in/email")) authRequests += 1;
  });

  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo electrónico").fill("correo-invalido");
  await page.getByLabel("Contraseña").fill("contraseña-segura");
  await page.getByRole("button", { name: "Entrar a mi cuenta" }).click();

  await expect(page.locator('p[role="alert"]')).toContainText(
    "Escribe un correo electrónico válido.",
  );
  expect(authRequests).toBe(0);
});

test("las páginas públicas y de acceso no desbordan el ancho de pantalla", async ({
  page,
}) => {
  for (const route of ["/", "/iniciar-sesion", "/registro"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow, `Desbordamiento horizontal en ${route}`).toBe(
      false,
    );
  }
});
