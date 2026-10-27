// Explicit integration contracts. No SDK, network request, account or billing is activated.
export interface ContentProvider {
  getPage(slug: string): Promise<{ title: string; description: string; body: string }>;
}
export interface OliviaProvider {
  ask(message: string, consent: boolean): Promise<{ answer: string }>;
}
export const integrations = Object.freeze({ formspree: false, datocms: false, olivia: false });
