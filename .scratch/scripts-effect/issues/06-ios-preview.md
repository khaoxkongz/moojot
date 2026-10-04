# 06: Move the iOS preview to Effect

**What to build:** The TypeScript iOS preview keeps every flag, positional argument, and screenshot name. The API server and Metro continue after the script stops, and the next run uses them again. Four simulator runs check the result. See the [spec](../spec.md).

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] The script parses its flags with `effect/unstable/cli`. It uses `FileSystem`, `Path`, and `ChildProcess` for its simulator, `curl`, and Maestro calls.
- [ ] The fixture requests use `HttpClient`. `Schema` decodes the preview login file, `CORS_ORIGIN`, and Maestro's `commands.json`.
- [ ] The script yields `containerNeedsReinstall` directly. The bridge from ticket 02 is gone.
- [ ] The API server and Metro start through `ChildProcess` in a scope that the program never closes. If they stop with the script, or if the script does not stop, use the `sh -c 'nohup … &'` fallback from the spec. A comment on this ticket records the observed result.
- [ ] Progress lines use `Effect.log`. The iOS preview skill matches the new lines.
- [ ] Stop the API server and Metro. Run `05-home-filter-queue.yaml` with `--theme light`, then with `--theme dark`. Both runs pass, and the script starts both servers.
- [ ] Run `02-auth-flow.yaml` with `--fixture --first-start`. The run passes.
- [ ] Run `03-onboarding-photos.yaml` with `--photos reset`. The run passes.
- [ ] Run the `05-home-error.yaml` and `05-home-recovered.yaml` pair with `--offline --keep-app`, as the iOS preview skill describes. Both runs pass.
- [ ] After each run, `lsof` shows the API server and Metro listening, and the script process no longer runs.
- [ ] The screenshots of these runs are in this feature's `notes/06-ios-preview/` directory.
- [ ] Every reference to the old preview script names the new file. These references include the iOS preview skill, the native app layout, and the Maestro flow comments.
- [ ] `vp test`, `vp check`, `vp run check`, and `vp run check-types` pass.
