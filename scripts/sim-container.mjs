// Checks the app's data container on the simulator before ios-preview launches the app.
// Issue 30: .scratch/native-redesign-ios/issues/30-ios-icon-font-download.md
import { existsSync } from "node:fs";
import path from "node:path";

// The container manager writes the metadata file and tmp/ when it installs an app. A container that lacks
// either was deleted and then re-created by the app itself (issue 30). The container manager no longer owns it,
// and URLSession has no tmp/ for its download files, so every asset download from Metro fails.
export function containerNeedsReinstall(dir) {
  return (
    !existsSync(path.join(dir, ".com.apple.mobile_container_manager.metadata.plist")) ||
    !existsSync(path.join(dir, "tmp"))
  );
}
