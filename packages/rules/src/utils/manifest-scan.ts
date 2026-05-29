export interface ManifestMatch {
  column: number;
  groups: RegExpExecArray;
  line: number;
  text: string;
}

export const lineNumberAtOffset = (source: string, offset: number): number => {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === "\n") {
      line += 1;
    }
  }
  return line;
};

/**
 * Returns the byte range of a top-level TOML table, e.g. extractSection(src, "dependencies").
 * Returns null if the section is absent. The range includes the `[name]` header line and ends
 * at the next top-level `[...]` header or end-of-file.
 */
export const extractSection = (
  source: string,
  sectionName: string
): { start: number; end: number } | null => {
  const headerPattern = new RegExp(
    `(^|\\n)\\[\\s*${sectionName}\\s*\\]\\s*\\n`
  );
  const headerMatch = source.match(headerPattern);
  if (!headerMatch) {
    return null;
  }
  const start = headerMatch.index! + (headerMatch[1]?.length ?? 0);
  const restStart =
    start + headerMatch[0].length - (headerMatch[1]?.length ?? 0);
  const nextHeaderPattern = /\n\s*\[/g;
  nextHeaderPattern.lastIndex = restStart;
  const nextHeader = nextHeaderPattern.exec(source);
  const end = nextHeader ? nextHeader.index : source.length;
  return { start, end };
};

export const scanManifest = (
  source: string,
  pattern: RegExp,
  onMatch: (match: ManifestMatch) => void
): void => {
  if (!pattern.global) {
    throw new Error(`scanManifest requires a /g regex; got ${pattern}`);
  }
  let groups: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((groups = pattern.exec(source)) !== null) {
    onMatch({
      line: lineNumberAtOffset(source, groups.index),
      column: 1,
      text: groups[0],
      groups,
    });
    if (groups.index === pattern.lastIndex) {
      pattern.lastIndex += 1;
    }
  }
};
