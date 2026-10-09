import { ActionError, defineAction } from "astro:actions";
import { Resend } from "resend";

import { CONTACT_EMAIL_ADDRESS } from "../consts";
import { buildContactEmail, contactInputSchema } from "./contact-project-type.mjs";

export const server = {
  contact: defineAction({
    accept: "form",
    input: contactInputSchema,
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
