export const SITE_URL = "https://mgalvan.dev";

export const CV_PATHS = {
  en: "/Marco-Galvan-CV-EN.pdf",
  es: "/Marco-Galvan-CV-ES.pdf",
} as const;

export const CONTACT_EMAIL = "mailto:elmacro11@gmail.com";
export const CONTACT_EMAIL_ADDRESS = "elmacro11@gmail.com";
export const WHATSAPP_PHONE_NUMBER = "5493855205726";
export const getWhatsAppUrl = (message: string) =>
  `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;

export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/mgalvan26/",
  github: "https://github.com/mgalvan-dev",
  x: "https://x.com/MarcoGal4",
} as const;
