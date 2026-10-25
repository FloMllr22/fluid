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

## Build and test tools (not shipped)

These development dependencies build, check and package fluid. Apart from small helper
functions that esbuild generates while transpiling for older engines (MIT), none of their
code ends up in the installed app.

| Tool | Licence | Used for |
|---|---|---|
| [Vite](https://vite.dev) with [@preact/preset-vite](https://github.com/preactjs/preset-vite) | MIT | building the app |
| [esbuild](https://esbuild.github.io) (through Vite) | MIT | transpiling for Chromium 53 |
| [TypeScript](https://www.typescriptlang.org) | Apache-2.0 | type checking |
| [Biome](https://biomejs.dev) | MIT or Apache-2.0 | linting and formatting |
| [Vitest](https://vitest.dev) | MIT | unit tests |
| [acorn](https://github.com/acornjs/acorn) | MIT | checking the bundle (`scripts/check-bundle.mjs`) |
| [webOS CLI](https://github.com/webos-tools/cli) (`@webos-tools/cli`, ares-package) | Apache-2.0 | packaging the `.ipk` |

## App and input icons

fluid ships no third-party app logos or LG artwork. The input glyphs are drawn for this
project (`src/components/Glyph.tsx`) and covered by the MIT licence. On the TV, app icons
are read from the TV itself at runtime, through the Homebrew Channel option, and never
become part of this repository or the package.

App names and IDs in `src/config/catalog.ts` only identify apps already installed on the
user's TV. They are trademarks of their respective owners. This project is not affiliated
with, endorsed by or sponsored by any of them.

"LG" and "webOS" are trademarks of LG Electronics.
