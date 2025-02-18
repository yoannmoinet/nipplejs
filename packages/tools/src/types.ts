export type Workspace = {
    name: string;
    slug: string;
    location: string;
};

export type SlugLessWorkspace = Omit<Workspace, 'slug'>;
