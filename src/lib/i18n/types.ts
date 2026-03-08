export interface DictionaryShape {
  app: {
    title: string;
    subtitle: string;
    badge: string;
    sampleLabel: string;
    recommended: Record<string, string>;
    actions: Record<string, string>;
    language: Record<string, string>;
    reference: Record<string, string>;
    deploy: Record<string, string>;
    preview: Record<string, string>;
    validation: Record<string, string>;
    advanced: Record<string, string>;
    import: Record<string, string>;
    feedback: Record<string, string>;
    emptyStates: Record<string, string>;
    common: Record<string, string>;
  };
  sections: Record<string, { title: string; description: string }>;
  fields: Record<string, readonly [string, string]>;
  helpers: Record<string, string>;
  options: Record<string, Record<string, string>>;
}
