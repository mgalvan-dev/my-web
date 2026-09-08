export interface CapabilityItem {
  title: string;
  description: string;
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
    process: string;
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
  };
  capabilities: {
    title: string;
    items: CapabilityItem[];
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
  experienceSummary: {
    title: string;
    text: string;
    linkedinLabel: string;
  };
  contact: {
    title: string;
    text: string;
    contactLabel: string;
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
