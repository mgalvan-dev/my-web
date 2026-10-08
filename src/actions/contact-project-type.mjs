import { z } from "astro/zod";

export const projectTypeField = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.string().optional(),
);

export const projectTypeInput = z.object({
  locale: z.enum(["en", "es"]),
  projectType: projectTypeField,
});

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
