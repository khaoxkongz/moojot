import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { containerNeedsReinstall } from "./sim-container.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// Builds a simulator data container with the given entries, as the container manager lays one out.
function container(entries) {
  const root = mkdtempSync(path.join(tmpdir(), "moojot-sim-container-"));
  roots.push(root);
  for (const entry of entries) {
    if (entry.startsWith(".")) writeFileSync(path.join(root, entry), "");
    else mkdirSync(path.join(root, entry), { recursive: true });
  }
  return root;
}

const metadata = ".com.apple.mobile_container_manager.metadata.plist";

describe("containerNeedsReinstall", () => {
  it("accepts a container the container manager made", () => {
    expect(containerNeedsReinstall(container([metadata, "Documents", "Library", "SystemData", "tmp"]))).toBe(false);
  });

  // Issue 30: the container was deleted and the app re-created only Library/Caches, so URLSession had no tmp/
  // for its download file and every Metro asset (the icon fonts) failed with UnableToDownloadAssetException.
  it("rejects a container the app re-created without tmp or metadata", () => {
    expect(containerNeedsReinstall(container(["Library/Caches"]))).toBe(true);
  });

  it("rejects a container without tmp", () => {
    expect(containerNeedsReinstall(container([metadata, "Documents", "Library"]))).toBe(true);
  });

  it("rejects a missing container", () => {
    expect(containerNeedsReinstall(path.join(tmpdir(), "moojot-no-such-container"))).toBe(true);
  });
});
