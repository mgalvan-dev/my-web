export interface ExperienceItem {
  url: string;
  title: string;
  time: string;
  descriptions: string[];
}

export interface ProjectItem {
  url?: string;
  title: string;
  description: string;
}

export interface ProductItem {
  url?: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

export interface Dictionary {
  hero: {
    title: string;
    subtitle: string;
    description: string;
    openToRemote: string;
    resumeUrl: string;
    ctaResume: string;
    ctaContact: string;
  };
  about: {
    title: string;
    descriptions: string[];
    technologiesTitle: string;
    technologies: string[];
  };
  experience: {
    title: string;
    experiences: ExperienceItem[];
  };
  featured: {
    title: string;
    items: ProductItem[];
  };
  projects: {
    title: string;
    projects: ProjectItem[];
  };
  contact: {
    title: string;
    text: string;
    contactLabel: string;
    linkedinLabel: string;
  };
  footer: {
    title: string;
    copyright: string;
  };
}
