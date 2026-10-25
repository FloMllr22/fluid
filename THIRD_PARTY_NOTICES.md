# Third-party notices

The MIT licence in [LICENSE](LICENSE) covers this project's own code and its app icon
(`public/icon.png`, `public/largeIcon.png`). The following material belongs to others and
is **not** covered by that licence.

## Bundled software

| Component | Licence | Where |
|---|---|---|
| [Preact](https://preactjs.com) | MIT, © Jason Miller | compiled into `assets/app.js`; licence text in [public/licenses/preact-MIT.txt](public/licenses/preact-MIT.txt) |
| [Inter](https://rsms.me/inter/) typeface | SIL Open Font License 1.1, © The Inter Project Authors | `src/assets/inter-latin-wght.woff2`; licence text in [public/licenses/Inter-OFL.txt](public/licenses/Inter-OFL.txt) |

Both licence texts are included in the installed app under `licenses/`.

## App and input icons

fluid ships no third-party app logos or LG artwork. The input glyphs are drawn for this
project (`src/components/Glyph.tsx`) and covered by the MIT licence. On the TV, app icons
are read from the TV itself at runtime, through the Homebrew Channel option, and never
become part of this repository or the package.

App names and IDs in `src/config/catalog.ts` only identify apps already installed on the
user's TV. They are trademarks of their respective owners. This project is not affiliated
with, endorsed by or sponsored by any of them.

"LG" and "webOS" are trademarks of LG Electronics.
