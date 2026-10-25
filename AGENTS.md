# Repository Guidelines

## Project Structure

Wide Stage for YouTube is a Manifest V3 extension for Chrome and Firefox. It is a single content script plus CSS on `https://www.youtube.com/*`, with no background script, no extension APIs, no runtime dependencies, and no network access.

- `manifest.json`: shared manifest. The repo root must stay loadable as an unpacked Chrome extension, so keep runtime files at the root.
- `content.js`: adds the wide stage button before YouTube's fullscreen button, handles the `` ` `` key on watch pages, and toggles the `ws-on` class on `<html>`. YouTube rebuilds its player controls and navigates as a single-page app, so the button is re-added from a MutationObserver and the mode resets on `yt-navigate-finish`.
- `style.css`: all layout for `html.ws-on`.
- `icons/`: extension icons.
- `platforms/firefox.json`: top-level manifest keys merged over `manifest.json` for Firefox (add-on ID, minimum version, data collection declaration).
- `build.mjs`: writes `dist/chrome/`, `dist/firefox/`, and a zip of each. The Chrome zip wraps the files in a `wide-stage-youtube/` folder for users to load unpacked; the Firefox zip must stay flat (`manifest.json` at its root) for Mozilla signing. Update `RUNTIME_FILES` when adding a runtime file.
- `sign-firefox.sh`: signs the Firefox build with Mozilla and attaches the `.xpi` to the GitHub release.
- `.github/workflows/release.yml`: builds both zips and creates the release when a version tag is pushed.

## Firefox Add-on ID

The Firefox ID is `wide-stage-youtube@deepakness.com`. Never change it: installed copies update in place only under the same ID, and Mozilla never lets an ID be reused.

## Build and Test

There is no `package.json` or test runner. Builds need Node and the system `zip` command.

- `node build.mjs` builds both browsers; `node build.mjs firefox` builds one.
- `npx web-ext lint --source-dir dist/firefox` must report no errors before signing.
- Chrome: **Load unpacked** on the repo root (or `dist/chrome`), reload the extension after edits, then refresh the YouTube tab.
- Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → `dist/firefox/manifest.json`.
- On a watch page, check the `` ` `` key and the player button in both directions, that typing `` ` `` in the search box or a comment does nothing, that the button survives navigating to another video, and that leaving the watch page turns the mode off.

Keep code browser-neutral and put browser differences in `platforms/firefox.json` rather than forking files.

## Release

1. Bump `version` in `manifest.json` and commit.
2. Push a matching tag: `git tag vX.Y.Z && git push origin vX.Y.Z`. The workflow fails if the tag and manifest version differ.
3. Wait for the Release workflow to create the GitHub release with `wide-stage-youtube-chrome.zip` and `wide-stage-youtube-firefox.zip`.
4. Run `./sign-firefox.sh`. It reads AMO API keys from the macOS Keychain, has Mozilla sign the build as unlisted (self-distributed, not on addons.mozilla.org), and attaches `wide-stage-youtube-firefox.xpi` to the release.
5. Write short release notes with `gh release edit`.

Mozilla signs each version only once. If a signed build needs a fix, bump the version and release again. Asset file names carry no version so the README's `releases/latest/download/...` links keep working.

## Coding Style and Commits

JavaScript uses single quotes, semicolons, 2-space indentation, and short comments that explain why. Build and release scripts follow the double-quote style they were copied with. Commit messages are short imperative summaries; release commits end with the version, e.g. `Add Firefox build and GitHub releases (v1.1.0)`.

## Security

- Never commit API keys, `.env` files, `dist/`, or signed `.xpi` files. Keys live only in the maintainer's Keychain (or, optionally, the `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` repo secrets the workflow can use).
- Keep the extension offline: no extra permissions, analytics, remote code, or network calls without an explicit product decision. The Firefox manifest declares that no data is collected.
