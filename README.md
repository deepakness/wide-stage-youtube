# Wide Stage for YouTube

Chrome and Firefox extension. Press `` ` `` on a YouTube video, or click the wide stage button next to the fullscreen button in the player, to fill the browser tab with the player. Do it again to go back to the normal page. The video keeps its aspect ratio, so it fills the screen when the shape matches and shows bars when it doesn't.

https://github.com/user-attachments/assets/26598d4e-1c75-4825-a4fe-af2384269a98

## Install in Chrome

1. Download [`wide-stage-youtube-chrome.zip`](https://github.com/deepakness/wide-stage-youtube/releases/latest/download/wide-stage-youtube-chrome.zip) from the latest release and unzip it. You get a folder named `wide-stage-youtube`.
2. Move that folder somewhere it can stay, such as `Documents`. Chrome loads the extension from it, so moving or deleting it breaks the extension.
3. Open `chrome://extensions` in Chrome and turn on **Developer mode** in the top right.
4. Click **Load unpacked** and select the `wide-stage-youtube` folder.

Open any YouTube video and press `` ` ``.

To update, download the newer zip from [Releases](https://github.com/deepakness/wide-stage-youtube/releases), replace the old `wide-stage-youtube` folder with the new one in the same place, click the reload icon on the extension card in `chrome://extensions`, and refresh the YouTube page.

To run the latest unreleased code instead, `git clone https://github.com/deepakness/wide-stage-youtube.git`, load the cloned folder the same way, and `git pull` to update.

## Install in Firefox

1. Download [`wide-stage-youtube-firefox.xpi`](https://github.com/deepakness/wide-stage-youtube/releases/latest/download/wide-stage-youtube-firefox.xpi) from the latest release.
2. Open the file in Firefox (drag it into a window, or use **File → Open File**) and click **Add**.

The `.xpi` is signed by Mozilla for self-distribution, so it stays installed across restarts. It is not listed on addons.mozilla.org and does not update itself. To update, download the newer `.xpi` from [Releases](https://github.com/deepakness/wide-stage-youtube/releases) and open it again. Needs Firefox 140 or newer.

If a release has no `.xpi` yet, unzip `wide-stage-youtube-firefox.zip` from it, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and pick `manifest.json`. Firefox removes temporary add-ons when it restarts.

## How it works

- `content.js` adds the player button, handles the `` ` `` key, and toggles the `ws-on` class on the page. `style.css` does the layout for that class.
- The repo root loads as-is in Chrome. `node build.mjs` writes `dist/chrome/` and `dist/firefox/` plus a zip for each; `platforms/firefox.json` holds the Firefox-only manifest keys (the add-on ID `wide-stage-youtube@deepakness.com`, which must never change).

## Release

1. Bump `version` in `manifest.json`, commit, and push.
2. Tag and push: `git tag v1.1.0 && git push origin v1.1.0` (the tag must match the version).
3. The [Release workflow](.github/workflows/release.yml) builds both browsers and attaches `wide-stage-youtube-chrome.zip` and `wide-stage-youtube-firefox.zip` to a new GitHub release.
4. Run `./sign-firefox.sh` locally. It has Mozilla sign the Firefox build as an unlisted add-on and attaches `wide-stage-youtube-firefox.xpi` to the same release. It reads [AMO API keys](https://addons.mozilla.org/developers/addon/api/key/) from the macOS Keychain; the top of the script shows how to store them. Mozilla signs each version only once.

## License

[MIT](LICENSE)
