#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SKILLS_DIR = ".claude/skills";
const publishUrl = process.env.PUBLISH_URL;
const publishToken = await readFile(process.env.PUBLISH_TOKEN_FILE, "utf8");
const sourceCommit = process.env.COMMIT_SHA;

if (!publishUrl || !sourceCommit) {
  console.error("PUBLISH_URL and COMMIT_SHA must be set");
  process.exit(1);
}

// Walks .claude/skills/ into the exact SkillsBundle JSON shape
// yd-playbook's own skillsBundle.ts/PlaybookVersionStore.publish() already
// expects (relative path -> file content) — never a tar, matching the
// real, already-committed format (see the implementation plan's own note
// on why design.md's "tar" description doesn't match reality).
async function walk(dir, baseDir, bundle) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, baseDir, bundle);
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath).split(path.sep).join("/");
      bundle[relativePath] = await readFile(fullPath, "utf8");
    }
  }
}

async function main() {
  const bundle = {};
  await walk(SKILLS_DIR, SKILLS_DIR, bundle);
  console.log(`Packaged ${Object.keys(bundle).length} files from ${SKILLS_DIR}`);

  const response = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${publishToken.trim()}` },
    body: JSON.stringify({ bundle, sourceCommit })
  });
  const data = await response.json();
  if (!response.ok) {
    console.error(`Publish failed: ${data.error ?? response.status}`);
    process.exit(1);
  }
  console.log(`Published skill version ${data.version.id}`);
  await writeFile("/workspace/published-version-id.txt", data.version.id, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
