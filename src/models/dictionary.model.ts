export type ServiceId = "automation" | "internal-systems" | "integrations";

export interface ServiceItem {
  id: ServiceId;
  title: string;
  description: string;
  cta: string;
}

export interface ProblemContent {
  title: string;
  body: string;
  items: string[];
  closing: string;
}

export interface MarfenCaseContent {
  eyebrow: string;
  title: string;
  body: string[];
  proof: string[];
  cta: string;
}

export interface ProfessionalCaseContent {
  eyebrow: string;
  title: string;
  problem: string;
  solution: string;
  result: string;
  cta: string;
}

export interface FitContent {
  title: string;
  items: string[];
  note: string;
}

export interface ContactFormContent {
  title: string;
  intro: string;
  nameLabel: string;
  companyLabel: string;
  contactLabel: string;
  processLabel: string;
  currentSolutionLabel: string;
  toolsLabel: string;
  contextLabel: string;
  submitLabel: string;
  successMessage: string;
  errorMessage: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export type ProjectContext =
  | "own-product"
  | "dam-squad"
  | "professional-experience";

export type ProjectStatus = "live";

export interface SelectedWorkLabels {
  contexts: Record<ProjectContext, string>;
  statuses: Partial<Record<ProjectStatus, string>>;
}

export interface SelectedWorkItem {
  url?: string;
  linkLabel?: string;
  name: string;
  category: string;
  context: ProjectContext;
  status?: ProjectStatus;
  title: string;
  description: string;
  role: string;
  tags: string[];
  image?: string;
  imageAlt?: string;
}

export interface Dictionary {
  metadata: {
    title: string;
    description: string;
    ogImageAlt: string;
  };
  navigation: {
    services: string;
    work: string;
    about: string;
    contact: string;
    cta: string;
    languageLabel: string;
    menuLabel: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    proof: string;
  };
  problem: ProblemContent;
  capabilities: {
    title: string;
    intro: string;
    items: ServiceItem[];
    iaNote: string;
  };
  process: {
    title: string;
    steps: ProcessStep[];
  };
  selectedWork: {
    title: string;
    labels: SelectedWorkLabels;
    items: SelectedWorkItem[];
  };
  marfenCase: MarfenCaseContent;
  professionalCase: ProfessionalCaseContent;
  experienceSummary: {
    title: string;
    paragraphs: string[];
    linkedinLabel: string;
  };
  fit: FitContent;
  contact: {
    title: string;
    text: string;
    contactLabel: string;
    whatsappLabel: string;
    whatsappMessage: string;
    formTitle: string;
    form: ContactFormContent;
    linkedinLabel: string;
    emailSubject: string;
  };
  footer: {
    title: string;
    role: string;
    emailLabel: string;
    copyright: string;
  };
}
