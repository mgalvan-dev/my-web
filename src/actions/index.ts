import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { Resend } from "resend";

import { CONTACT_EMAIL_ADDRESS } from "../consts";

const contactInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    company: z.string().trim().min(1).max(120),
    contact: z.string().trim().min(1).max(240),
    process: z.string().trim().min(1).max(1600),
    currentSolution: z.string().trim().min(1).max(1600),
    tools: z.string().trim().max(1200).nullable().optional(),
    context: z.string().trim().max(1600).nullable().optional(),
    website: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

function escapeHtml(value: string | null | undefined): string {
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

function buildContactEmail(input: z.infer<typeof contactInput>) {
  const rows = [
    ["Name", input.name],
    ["Company", input.company],
    ["Contact", input.contact],
    ["Process", input.process],
    ["Current solution", input.currentSolution],
    ["Tools", input.tools],
    ["Context", input.context],
  ] as const;

  return {
    html: rows
      .map(
        ([label, value]) =>
          `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value)}</p>`,
      )
      .join(""),
    text: rows.map(([label, value]) => `${label}: ${value ?? ""}`).join("\n\n"),
  };
}

export const server = {
  contact: defineAction({
    accept: "form",
    input: contactInput,
    handler: async (input) => {
      if (input.website) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Unable to submit this form.",
        });
      }

      const apiKey = import.meta.env.RESEND_API_KEY;
      const from = import.meta.env.RESEND_FROM_EMAIL;

      if (!apiKey || !from) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to send your message right now.",
        });
      }

      try {
        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({
          from,
          to: [CONTACT_EMAIL_ADDRESS],
          subject: "New Services V1 inquiry",
          ...buildContactEmail(input),
        });

        if (error) throw new Error("Resend delivery failed");
      } catch {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to send your message right now.",
        });
      }

      return { ok: true };
    },
  }),
};
