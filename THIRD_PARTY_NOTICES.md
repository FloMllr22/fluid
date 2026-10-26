# Third-party notices

The MIT licence in [LICENSE](LICENSE) covers this project's own code and its app icon
(`public/icon.png`, `public/largeIcon.png`). The following material belongs to others and
is **not** covered by that licence.

## Bundled software

| Component | Licence | Where |
|---|---|---|
| [Preact](https://preactjs.com) | MIT, © Jason Miller | compiled into `assets/app.js`; licence text in [public/licenses/preact-MIT.txt](public/licenses/preact-MIT.txt) |
| [Manrope](https://github.com/sharanda/manrope) typeface | SIL Open Font License 1.1, © 2019 The Manrope Project Authors | `src/assets/fonts/manrope-latin-*.woff2` (weights 400 to 800, Latin subset, as packaged by [Fontsource](https://fontsource.org)); licence text in [public/licenses/Manrope-OFL.txt](public/licenses/Manrope-OFL.txt) |

Both licence texts are included in the installed app under `licenses/`.

## Background photos

The photos fluid offers as backgrounds come from [Unsplash](https://unsplash.com) and are
under the [Unsplash License](https://unsplash.com/license): they may be used, copied,
modified and distributed for free, without asking and without attribution, but not sold
without significant modification or compiled into a similar or competing service. fluid
names the photographers anyway. For the app, each photo was cropped to 16:9, scaled to
1920×1080 and saved again as JPEG without its metadata, with a 288×288 thumbnail.

| Files in `src/assets/backgrounds/` | Photo | Photographer | Source |
|---|---|---|---|
| `fuji.jpg`, `fuji.thumb.jpg` | Mount Fuji at night above a lake, Fujinomiya, Japan | Clay Banks (@claybanks) | [unsplash.com](https://unsplash.com/de/fotos/foto-von-berg-u27Rrbs9Dwc) |
| `beach.jpg`, `beach.thumb.jpg` | Waves on a beach at sunset | Eugene Kim (@evgenii__kim) | [unsplash.com](https://unsplash.com/ko/사진/일몰-동안-해안에-부딪히는-바다-파도-mQ1-HR_XdIg) |
| `sunset.jpg`, `sunset.thumb.jpg` | Waves splashing on sand at sunset | Quino Al (@quinoal) | [unsplash.com](https://unsplash.com/de/fotos/wellen-von-gewassern-die-auf-sand-spritzen-mBQIfKlvowM) |

## Weather and place data

With the weather turned on (it is off until the user turns it on), fluid shows data it
reads at runtime from [Open-Meteo](https://open-meteo.com), through its free API for
non-commercial use, which needs no key. None of this data is part of this repository or
the package.

| Data | Source | Licence |
|---|---|---|
| Current weather: temperature, WMO weather code, day or night | [Open-Meteo.com](https://open-meteo.com) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Place search: names, regions, countries and coordinates | [GeoNames](https://www.geonames.org), through Open-Meteo's geocoding API | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

fluid credits both in Settings → Weather. It rounds the temperature to whole degrees and
converts it to °F where the TV's region uses that; the weather glyphs and the words for
the sky are fluid's own.

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
are read from the TV itself at runtime, through the Homebrew Channel, and never become
part of this repository or the package.

App names, like the icons, are read from the user's TV at runtime. They are trademarks of
their respective owners. This project is not affiliated with, endorsed by or sponsored by
any of them.

"LG" and "webOS" are trademarks of LG Electronics.
