# Release runbook — mobile app

The app is distributed as an APK outside the Play Store. Phones update themselves:
on launch the app calls `GET /app/version` and, if `latestVersion` is newer than the
installed native version, offers (or forces, when `mandatory`) the download.
Background and the in-app updater are described in `HANDOFF.md` §9; this file is the
step-by-step.

## Test build (nobody gets updated)

Use this to try a change on one phone before releasing.

1. Do **not** bump the version. Keeping the installed `version` / `versionCode`
   lets the APK install over the current app without losing the session.
2. Build in the cloud (EAS local builds are not supported on Windows):
   ```bash
   npx eas-cli build -p android --profile preview --non-interactive --json --message "Test build: <what>"
   ```
   The JSON output has `artifacts.applicationArchiveUrl` — the direct `.apk` link.
3. Share that link (or a QR of it) with the tester. Do **not** publish it to the backend.

## Release to every device

1. Bump both values in `app.json`: `expo.version` (semver, e.g. `1.2.8`) and
   `expo.android.versionCode` (+1). Commit as `chore(release): bump version to X.Y.Z`.
2. Build:
   ```bash
   npx eas-cli build -p android --profile preview --non-interactive --json --message "Release X.Y.Z"
   ```
   Check the output reports the new `appVersion` / `appBuildVersion`.
3. Download the APK and name it `loop-X.Y.Z.apk`.
4. Publish it with an ADMIN account. Either the panel's app-version screen, or
   `POST /app/version` as `multipart/form-data` with:
   - `version` = `X.Y.Z` — **must match** `expo.version` of the build, otherwise phones
     keep being asked to update forever;
   - `mandatory` = `true` | `false`;
   - `notes` (optional, shown to the user);
   - `file` = the APK.
   From this moment every phone that opens the app gets the update prompt.
5. Verify:
   - `GET /app/version` returns the new `latestVersion` and the expected `mandatory`;
   - `GET <apkUrl>` downloads the full file (same size as the build).
6. Make sure `CHANGELOG.md` has the release's changes under `[Unreleased]`, tagged with the version
   (the project keeps everything in `[Unreleased]`, no per-version sections).

## Notes

- The backend URL is baked in at build time from `eas.json` →
  `build.<profile>.env.EXPO_PUBLIC_API_URL`; the local `.env` is not used by EAS.
- Features that need a newer backend (e.g. ADMIN corrections) only work once that
  backend is deployed — release the backend first.
