import { z } from "astro/zod";

export const projectTypeField = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().optional(),
);

export const projectTypeInput = z.object({
  locale: z.enum(["en", "es"]),
  projectType: projectTypeField,
});

export const contactInputSchema = addProjectTypeValidation(z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().max(254).pipe(z.email()),
    message: z.string().trim().min(1).max(4000),
    website: z.string().trim().max(120).nullable().optional(),
    locale: z.enum(["en", "es"]),
    projectType: projectTypeField,
  })
  .strict());

export function addProjectTypeValidation(schema) {
  return schema.superRefine((input, context) => {
    const projectTypeError = input.locale === "es"
      ? "Seleccioná una opción válida."
      : "Select a valid option.";
    if (
      input.projectType !== undefined &&
      !["custom-software", "website", "automation-ai", "unsure"].includes(input.projectType)
    ) {
      context.addIssue({
        code: "custom",
        path: ["projectType"],
        message: projectTypeError,
      });
    }
  });
}

const projectTypeOptions = {
  "custom-software": { en: "Custom software or application", es: "Software o aplicación a medida" },
  website: { en: "Website or landing page", es: "Sitio web o landing page" },
  "automation-ai": { en: "Automation or AI agent", es: "Automatización o agente de IA" },
  unsure: { en: "I’m not sure yet", es: "No estoy seguro" },
};

export function buildProjectTypeEmailRow(projectType, locale) {
  if (!projectType) return undefined;
  return [
    locale === "es" ? "Tipo de proyecto" : "Project type",
    projectTypeOptions[projectType][locale],
  ];
}

function escapeHtml(value) {
  return (value ?? "").replace(
    /[&<>\"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export function buildContactEmail(input) {
  const labels = input.locale === "es"
    ? { name: "Nombre", email: "Email", message: "Mensaje", subject: "Nueva consulta de proyecto" }
    : { name: "Name", email: "Email", message: "Message", subject: "New project inquiry" };
  const projectTypeRow = buildProjectTypeEmailRow(input.projectType, input.locale);
  const rows = [
    [labels.name, input.name],
    [labels.email, input.email],
    ...(projectTypeRow ? [projectTypeRow] : []),
    [labels.message, input.message],
  ];
  const projectTypeLabel = projectTypeRow?.[1];

  return {
    subject: projectTypeLabel
      ? input.locale === "es"
        ? `Nueva consulta: ${projectTypeLabel}`
        : `New inquiry: ${projectTypeLabel}`
      : labels.subject,
    html: rows
      .map(
        ([label, value]) =>
          `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value)}</p>`,
      )
      .join(""),
    text: rows.map(([label, value]) => `${label}: ${value}`).join("\n\n"),
  };
}
