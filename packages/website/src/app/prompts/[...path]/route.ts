import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { repoPath } from "@/lib/repo-path";
import { allRules } from "@/lib/rules";

export const dynamic = "force-static";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

interface ParamShape {
  path: string[];
}

export const generateStaticParams = (): ParamShape[] => {
  const params: ParamShape[] = [{ path: ["move-doctor-agent.md"] }];
  for (const rule of allRules) {
    params.push({ path: ["rules", rule.bucket, `${rule.slug}.md`] });
  }
  return params;
};

const resolveFile = (segments: string[]): string | null => {
  if (segments.length === 1 && segments[0] === "move-doctor-agent.md") {
    return repoPath("skills", "move-doctor", "SKILL.md");
  }
  if (segments.length === 3 && segments[0] === "rules") {
    const bucket = segments[1]!;
    const fileName = segments[2]!;
    if (!fileName.endsWith(".md")) {
      return null;
    }
    const slug = fileName.slice(0, -".md".length);
    return repoPath("docs", "rules", bucket, `${slug}.md`);
  }
  return null;
};

export const GET = async (
  _request: Request,
  { params }: RouteParams
): Promise<Response> => {
  const { path: segments } = await params;
  const filePath = resolveFile(segments);
  if (!(filePath && existsSync(filePath))) {
    return new Response("Not found", { status: 404 });
  }
  const content = await readFile(filePath, "utf8");
  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
};
