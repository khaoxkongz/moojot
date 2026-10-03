import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { containerNeedsReinstall } from "./sim-container.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// Builds a simulator data container with the given files and directories.
function container({ files = [], dirs = [] }) {
  const root = mkdtempSync(path.join(tmpdir(), "moojot-sim-container-"));
  roots.push(root);
  for (const dir of dirs) mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of files) writeFileSync(path.join(root, file), "");
  return root;
}

const metadata = ".com.apple.mobile_container_manager.metadata.plist";

describe("containerNeedsReinstall", () => {
  it("accepts a container the container manager made", () => {
    expect(
      containerNeedsReinstall(container({ files: [metadata], dirs: ["Documents", "Library", "SystemData", "tmp"] }))
    ).toBe(false);
  });

  // Issue 30: the app re-created only Library/Caches after the container was deleted.
  it("rejects a container the app re-created without tmp or metadata", () => {
    expect(containerNeedsReinstall(container({ dirs: ["Library/Caches"] }))).toBe(true);
  });

  it("rejects a container without tmp", () => {
    expect(containerNeedsReinstall(container({ files: [metadata], dirs: ["Documents", "Library"] }))).toBe(true);
  });

  it("rejects a container with tmp but without metadata", () => {
    expect(containerNeedsReinstall(container({ dirs: ["Documents", "Library", "tmp"] }))).toBe(true);
  });

  it("rejects a missing container", () => {
    expect(containerNeedsReinstall(path.join(tmpdir(), "moojot-no-such-container"))).toBe(true);
  });
});
