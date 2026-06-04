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
  products: {
    title: string;
    products: ProductItem[];
  };
  footer: {
    title: string;
    copyright: string;
  };
}
