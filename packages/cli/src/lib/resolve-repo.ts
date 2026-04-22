export interface RepoRef {
  owner: string;
  name: string;
}

const URL_RE = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;
const SLUG_RE = /^([^/\s]+)\/([^/\s]+)$/;

export function resolveRepo(input: string): RepoRef | null {
  const trimmed = input.trim();
  const asUrl = trimmed.match(URL_RE);
  if (asUrl) {
    return { owner: asUrl[1], name: asUrl[2].replace(/\.git$/, "") };
  }
  const asSlug = trimmed.match(SLUG_RE);
  if (asSlug) {
    return { owner: asSlug[1], name: asSlug[2].replace(/\.git$/, "") };
  }
  return null;
}
