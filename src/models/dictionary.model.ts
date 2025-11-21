export interface ExperienceItem {
  url: string;
  title: string;
  time: string;
  descriptions: string[];
  stack: string;
}

export interface ProjectItem {
  url?: string;
  title: string;
  description: string;
}

export interface Dictionary {
  hero: {
    title: string;
    subtitle: string;
    description: string;
    cta: string;
  };
  nav: {
    about: string;
    experience: string;
    projects: string;
    contact: string;
  };
  about: {
    title: string;
    descriptions: string[];
  };
  experience: {
    title: string;
    experiences: ExperienceItem[];
  };
  projects: {
    title: string;
    projects: ProjectItem[];
  };
  footer: {
    title: string;
    copyright: string;
  };
}
