import type { ProjectLink } from "@/app/types";

export const normalizeProjectLinks = (
  value: unknown
): ProjectLink[] => {
  if (!value) {
    return [];
  }

  const results: ProjectLink[] = [];

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      results.push(...normalizeProjectLinks(entry));
    });
    return results;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .map((name) => ({ name }));
  }

  if (value && typeof value === "object") {
    const candidate = value as { name?: unknown; url?: unknown };
    const name =
      typeof candidate.name === "string"
        ? candidate.name.trim()
        : typeof candidate.name === "number"
        ? String(candidate.name).trim()
        : "";

    if (!name) {
      return [];
    }

    const url =
      typeof candidate.url === "string" && candidate.url.trim().length > 0
        ? candidate.url.trim()
        : undefined;

    return url ? [{ name, url }] : [{ name }];
  }

  return results;
};

type PersistableProjectLink =
  | { name: string; url: string }
  | { name: string; url?: undefined };

export const sanitizeProjectLinksForPersistence = (
  projects: ProjectLink[]
): PersistableProjectLink[] => {
  const normalized: Array<PersistableProjectLink | null> = projects
    .map((project) => {
      const name = project.name?.trim() ?? "";
      if (!name) {
        return null;
      }
      const url =
        typeof project.url === "string" && project.url.trim().length > 0
          ? project.url.trim()
          : undefined;
      return url ? { name, url } : { name, url: undefined };
    });

  const filtered = normalized.filter(
    (project): project is PersistableProjectLink =>
      project !== null && project.name.length > 0
  );

  return filtered;
};

export const projectLinksToDisplayString = (
  projects: ProjectLink[]
): string =>
  projects
    .map((project) => project.name.trim())
    .filter((name) => name.length > 0)
    .join(", ");

