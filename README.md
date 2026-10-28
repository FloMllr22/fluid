# fluid – a home screen for LG webOS TVs

fluid is a calm, fast home-screen launcher for **rooted** LG webOS TVs: your apps on a
wheel on the left, your inputs and a way back to LG's own home at the top right, and a large
greeting with the date, the time and (if you like) the weather.

> **Status: early development.** fluid runs on the maintainer's TV, but it is a
> foundation, not a finished product. Expect changes, and no releases yet.

## What it does

- **Apps**: the apps you pick, in your order, your favourites first, on a wheel that turns the
  one you choose to the middle, round and round
- **Sources**: a menu of Live TV and the HDMI inputs, with the names set in the TV's input
  settings
- **LG** and **Settings**: LG's own home screen, and fluid's settings
- **Background**: dark, OLED black, calm blue or dusk (an evening sky, still or alive with
  drifting clouds, shooting stars and light on the sea), one of three photos, or a
  slideshow of them
- **Weather** (optional, off until you turn it on): the sky and temperature at a place you
  search for, from [Open-Meteo](https://open-meteo.com), in °C or °F as your TV's region uses
- **First start**: a short setup in three steps (language, apps, background); all of it can be
  changed later in Settings
- Speaks English and German: the TV's language, or the one you pick; follows the TV's 12/24-hour
  clock setting
- Works with the remote's arrow keys and with the Magic Remote pointer
- No telemetry, and no network access at all unless you turn the weather on (see
  [Privacy](#privacy)); your settings stay in the app's storage on the TV

## Requirements

- An LG TV with **webOS 4.0 or later** (models from 2018 on)
- **Root** and the [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel),
  with its SSH server enabled for installing from a computer

So far fluid is tested on one TV, running webOS 6.5. The build targets the browser engine
of webOS 4 (Chromium 53), but nothing has been tried on webOS 4 or 5 yet. Compatibility
reports (TV model, webOS version, firmware version) are welcome.

## Using it

| Where | Key | Does |
|---|---|---|
| First start, language | ← →, OK | Pick a language and go on |
| First start, apps and background | OK | Go on with what is chosen (focus starts on **Next** / **Finish**) |
| First start, apps and background | ↓, then as in Settings | Choose apps (and re-order them) or a background |
| First start | Back | Return to the step before |
| Home | ↑ ↓ | Turn the wheel to the next app (after the last comes the first again) |
| Home | → | To Sources, LG and Settings at the top right (← → along them, ← or ↓ back to the apps) |
| Home | OK | Open the app, open the Sources menu, LG's home screen or Settings |
| Sources menu | ↑ ↓, OK | Switch to that input (Back closes the menu) |
| Home | Hold OK on an app | Its menu beside it: add to or remove from favourites, move, hide |
| Moving an app (Home) | ↑ ↓, then OK | Move it along the list, keep its new place |
| Moving an app (Home) | Back | Put it back where it was |
| Settings | ↑ ↓, then → | Choose a tab on the left, then go into it (← comes back) |
| Settings | OK | Add or remove an app or source |
| Settings | Hold OK (or the **Re-order** button) | Enter or leave re-order mode |
| Re-order mode | OK, arrows, OK | Pick up a tile, move it, put it down |
| Re-order mode | Back | Cancel the move or leave re-order mode |
| Settings, Background tab | OK | Use that background (it changes at once) |
| Settings, Weather tab | OK | Turn the weather on or off, open the keyboard to search for a place, or use the place found |
| Typing a place | OK | Search at once (the search also starts when you pause typing) |
| Typing a place | Back, ↑ ↓ | Leave the field |
| Settings, Language tab | ← →, OK | Use that language (it changes at once) |
| Settings | Back | Return home |

The Magic Remote pointer is hidden when fluid opens; shake the remote to bring it back.
On Home, clicking an app turns the wheel to it, and clicking the app in the middle opens it;
elsewhere pointing selects and clicking opens. Holding the click on an app opens its menu,
clicking beside a menu closes it. While an app is being moved, its arrows move it and
clicking it puts it down.

**Where the apps come from.** fluid reads every app on the TV's launcher, with its real
icon, from the TV itself, through the Homebrew Channel. That is why it needs root. Until you
pick apps in Settings, the list shows all of them in the order of LG's launcher. fluid reads
the list again whenever you come back to it, so an app you install or uninstall shows up or
is gone without restarting fluid. A new app joins Home: where LG's launcher puts it while
Home shows all apps, at the end once you have picked, hidden, moved or favourited apps.
Apps you hid stay hidden. If the Homebrew Channel is missing or has lost root (a firmware update can do that),
the list says so; Sources and LG Home keep working, and fluid tries again when you come back
to it.

fluid does not take over the HOME button yet. You can map a remote button to it with
[LG Input Hook](https://github.com/Simon34545/lginputhook) (app ID
`io.github.flomllr22.fluid`).

## Privacy

fluid has no telemetry and no account. It makes network connections only for the weather,
and only once you turn it on in Settings → Weather; while it is off, fluid opens no
connection at all. Both kinds of request go to [Open-Meteo](https://open-meteo.com), which needs
no account or key:

- **Place search** (`geocoding-api.open-meteo.com`): the name you type and fluid's
  language (`en` or `de`), only while you search in Settings.
- **Weather** (`api.open-meteo.com`): the coordinates of the place you picked, rounded to
  about a kilometre, every 30 minutes while fluid is in front, never while another app is.

fluid itself does not locate you, and sends nothing about you or your TV. Open-Meteo sees
your TV's IP address, as any server it connects to does. The place you picked (with its
name) and the last weather stay on the TV, so the weather shows at once, also offline.

## Install from source

There are no releases yet, so fluid is built and installed from a computer (Windows,
Linux or macOS) with [Node.js](https://nodejs.org) 24.

### 1. Set up key login to the TV (once)

Create a key and copy its public half to the TV. The first `ssh` asks for the TV's root
password; after that the key is used.

Windows (PowerShell):

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\fluid_tv" -C "fluid-deploy"
Get-Content "$env:USERPROFILE\.ssh\fluid_tv.pub" | ssh root@<tv-ip> "mkdir -p ~/.ssh; chmod 700 ~/.ssh; tr -d '\r' >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys"
```

Linux and macOS:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/fluid_tv -C "fluid-deploy"
ssh-copy-id -i ~/.ssh/fluid_tv.pub root@<tv-ip>
```

Check that it works without a password: `ssh -i ~/.ssh/fluid_tv root@<tv-ip> "echo ok"`
(in PowerShell, use `"$env:USERPROFILE\.ssh\fluid_tv"` for the key path).

### 2. Tell fluid where the TV is

Copy `tv.env.example` to `tv.env` (`Copy-Item tv.env.example tv.env` in PowerShell,
`cp tv.env.example tv.env` elsewhere) and fill in the TV's address. `tv.env` is
git-ignored, so the address and key path never end up in the repository.

| Setting | Meaning | Default |
|---|---|---|
| `TV_HOST` | IP address or host name of the TV | required |
| `TV_PORT` | Port of the Homebrew Channel's SSH server | `22` |
| `TV_USER` | User on the TV | `root` |
| `TV_KEY` | Private key from step 1; `~` is your home folder | ssh's default keys |

### 3. Build and install

```sh
npm install
npm run deploy
```

`npm run deploy` type-checks and builds fluid, packages it as an `.ipk`, copies it to the TV
over SSH, installs it with webOS's developer install service (the same one the Homebrew
Channel uses) and launches it. It only uses key login, so a wrong key or address fails
with a message instead of waiting at a password prompt. Running it again updates fluid;
the settings on the TV are kept.

### Uninstall

Log in to the TV with `ssh root@<tv-ip>` and run:

```sh
luna-send -n 1 luna://com.webos.appInstallService/dev/remove '{"id":"io.github.flomllr22.fluid"}'
```

## Development

| Command | Does |
|---|---|
| `npm run dev` | Runs fluid in a desktop browser, with neutral sample apps and inputs; add `?lang=de` (or `en-US` …) for another language, `?apps-error=no-homebrew` (or `no-root`, `timeout` …) to see a failed app list, `?weather-error=offline` (or `service`) a failed weather and place search, `?weather-code=71` (any WMO code) and `?weather-night=1` other skies, `?apps=40` a long list of apps. The browser never goes online: places and weather are sample data. `localStorage.clear()` in the console, then reload, shows the first-start setup again |
| `npm run check` | Lint (Biome), type check (TypeScript) and unit tests (Vitest) |
| `npm run format` | Formats the code and applies safe lint fixes |
| `npm run build` | Type-checks, builds `dist/` and checks the bundle's syntax and CSS for webOS 4 |
| `npm run package` | Packages `dist/` into `build/io.github.flomllr22.fluid_<version>_all.ipk` |
| `npm run install:tv` | Installs the existing package on the TV without rebuilding |
| `npm run deploy` | `build`, `package` and `install:tv` in one go |

All scripts are plain Node, so they work the same in PowerShell, cmd and Unix shells.
CI runs `check`, `build` and `package` on Linux and Windows for pushes to `main` and for
pull requests.

### Notes on the platform

- **Oldest engine: Chromium 53 (webOS 4).** Everything is compiled down to it, and
  `scripts/check-bundle.mjs` fails the build if the bundle is not valid ES2016 or its CSS
  uses features Chromium 53 lacks (CSS Grid, flexbox `gap`, `inset`, `aspect-ratio` …).
  The type check only knows the ES2016 standard library, so newer built-ins such as
  `Object.entries` or `Array.prototype.flat` are reported as errors.
- **One classic script.** webOS refuses `<script type="module">` from `file://`, so Vite
  builds a single IIFE and the HTML loads it with `defer`.
- **Luna calls** without root: `applicationManager/launch` and `getAppLoadStatus`,
  `eim/getAllInputStatus`, `systemservice/getPreferences` (clock format).
- **App list** (root): asks the Homebrew Channel's service, which runs commands as root,
  for `listLaunchPoints` and for each icon as base64. fluid only sends fixed commands;
  icon paths are validated and shell-quoted, and app IDs never reach the shell. When that
  fails, `getAppLoadStatus` and the Homebrew Channel's `getConfiguration` tell whether it
  is missing or running without root.
- **Network.** Only the weather (Open-Meteo, see [Privacy](#privacy)) goes online, through
  one `XMLHttpRequest` helper in `src/platform/webos/` with a timeout (Chromium 53 has no
  `AbortController`); a test keeps every other file off the network. Answers are
  checked field by field before fluid uses them.
- **Pointer.** The system draws the pointer, so CSS cannot hide it; fluid calls
  `webOSSystem.setCursorHidden(true)` whenever it comes to the foreground.
- **Language.** Unless a language is picked in Settings (or at the first start), fluid
  follows the TV's UI language (`webOSSystem.locale`) and falls back
  to English. Dates come from `Intl` where the engine has the locale, otherwise from the
  names in the locale file; plural rules are fluid's own, as `Intl.PluralRules` only
  arrived in Chromium 63. To add a language, translate `src/i18n/locales/en.json` and add
  it to `LANGUAGES` and `PLURAL_RULES` in `src/i18n/index.ts`; the tests check that every
  key and placeholder is there.
- **Debugging.** A rooted TV exposes the web inspector on port 9998.

### Project layout

```
src/
  platform/    the only way to the TV and the network: one interface, webos/ (Luna,
               Homebrew shell, Open-Meteo) and mock/ (neutral sample data for the
               desktop browser)
  config/      constants (app ID, key codes, timings)
  theme/       design tokens (colours, type, layout, motion) and the stylesheet
  i18n/        texts (locales/en.json, de.json), plural rules, dates via Intl with a fallback
  state/       settings: one versioned schema with migrations; the weather cache
  lib/         clock, ordering, Home and grid navigation, tile adapters, weather
  hooks/       remote keys, OK press/hold, pointer hold, clock tick, time format, weather,
               place search, grid tabs (Settings and the first start)
  components/  AppList, Bar, Menu, AppMenu, Greeting, WeatherNow, Grid, Tile, AppIcon,
               OptionList, WeatherPanel, LanguageChoice, Glyph, Time, Toast
  screens/     Home, Settings, Onboarding (first start)
  app.tsx      state, data loading and wiring
scripts/       package, deploy, bundle check, Homebrew manifest
public/        appinfo.json, app icon, licence texts
.github/       CI on push and pull request; release on tag
```

### Releasing

Set the same `version` in `public/appinfo.json` and `package.json` (a unit test checks
that they match), commit, then tag and push the tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow builds the `.ipk`, writes a Homebrew Channel manifest with the
package's SHA-256 and attaches both to a GitHub release.

## Licence and credits

[MIT](LICENSE). fluid started as a fork of
[partridgeworks/webos-launcher](https://github.com/partridgeworks/webos-launcher), whose
copyright notice is kept in the licence. Bundled Preact (MIT) and the Manrope and Outfit
typefaces (SIL OFL 1.1), and the tools used to build fluid, are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), as is the data the weather shows: weather
data by [Open-Meteo.com](https://open-meteo.com) and place data by
[GeoNames](https://www.geonames.org), both under CC BY 4.0.

fluid ships no third-party logos. This project is not affiliated with LG Electronics or
any app publisher; "LG" and "webOS" are trademarks of LG Electronics.

Developed with AI assistance (Claude Code), directed and tested on a real TV by the
maintainer.
