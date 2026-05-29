import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import type { ProjectInfo } from "../types.js";

export class MoveProjectNotFoundError extends Error {
  constructor(searchedFrom: string) {
    super(`no Move.toml found at or above ${searchedFrom}`);
    this.name = "MoveProjectNotFoundError";
  }
}

export class MoveManifestMalformedError extends Error {
  constructor(manifestPath: string) {
    super(
      `Move.toml at ${manifestPath} is malformed (no [package] table found or unreadable name).`
    );
    this.name = "MoveManifestMalformedError";
  }
}

const findManifestUpward = (startDirectory: string): string | null => {
  let currentDirectory = path.resolve(startDirectory);
  while (true) {
    const candidate = path.join(currentDirectory, "Move.toml");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(currentDirectory);
    if (parent === currentDirectory) {
      return null;
    }
    currentDirectory = parent;
  }
};

const parsePackageName = (manifestSource: string): string | null => {
  const nameMatch = manifestSource.match(/^\s*name\s*=\s*"([^"]+)"/m);
  return nameMatch?.[1] ?? null;
};

const parseEdition = (manifestSource: string): string | null => {
  const editionMatch = manifestSource.match(/^\s*edition\s*=\s*"([^"]+)"/m);
  return editionMatch?.[1] ?? null;
};

const hasPackageTable = (manifestSource: string): boolean =>
  /^\s*\[package\]/m.test(manifestSource);

export const discoverProject = async (
  startDirectory: string
): Promise<ProjectInfo> => {
  const manifestPath = findManifestUpward(startDirectory);
  if (!manifestPath) {
    throw new MoveProjectNotFoundError(startDirectory);
  }

  const manifestSource = await readFile(manifestPath, "utf8");
  const packageName = parsePackageName(manifestSource);
  if (!hasPackageTable(manifestSource) && packageName === null) {
    // treat the manifest as malformed if neither a [package] table nor a name field is recoverable.
    throw new MoveManifestMalformedError(manifestPath);
  }

  return {
    rootDirectory: path.dirname(manifestPath),
    manifestPath,
    packageName: packageName ?? "<unknown>",
    edition: parseEdition(manifestSource),
  };
};
