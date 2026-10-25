# fluid – a home screen for LG webOS TVs

fluid is a calm, fast home-screen launcher for **rooted** LG webOS TVs: a greeting and
clock, a row of your apps, a row of your inputs, and a way back to LG's own home.

> **Status: early development.** fluid runs on the maintainer's TV, but it is a
> foundation, not a finished product. Expect changes, and no releases yet.

## What it does

- **Apps**: the apps you pick, in your order
- **Sources**: Live TV and the HDMI inputs, with the names set in the TV's input settings
- **More**: LG's own home screen, and Settings
- Speaks English and German, following the TV's language, and the TV's 12/24-hour clock setting
- Works with the remote's arrow keys and with the Magic Remote pointer
- No network access, no telemetry: your settings stay in the app's storage on the TV

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
| Home | ↑ ↓ | Move between rows |
| Home | ← → | Move along a row |
| Home | OK | Open the app or input |
| Settings | OK | Add or remove an app or source |
| Settings | Hold OK (or the **Re-order** button) | Enter or leave re-order mode |
| Re-order mode | OK, arrows, OK | Pick up a tile, move it, put it down |
| Re-order mode | Back | Cancel the move or leave re-order mode |
| Settings | Back | Return home |

The Magic Remote pointer is hidden when fluid opens; shake the remote to bring it back.
Pointing selects, clicking opens.

**Where the apps come from.** fluid reads every app on the TV's launcher, with its real
icon, from the TV itself, through the Homebrew Channel. That is why it needs root. Until you
pick apps in Settings, the Apps row shows all of them in the order of LG's launcher. If the
Homebrew Channel is missing or has lost root (a firmware update can do that), the Apps row
says so; Sources and LG Home keep working, and fluid tries again when you come back to it.

fluid does not take over the HOME button yet. You can map a remote button to it with
[LG Input Hook](https://github.com/Simon34545/lginputhook) (app ID
`io.github.flomllr22.fluid`).

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
| `npm run dev` | Runs fluid in a desktop browser, with neutral sample apps and inputs; add `?lang=de` (or `en-US` …) for another language, `?apps-error=no-homebrew` (or `no-root`, `timeout` …) to see a failed app list |
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
- **Pointer.** The system draws the pointer, so CSS cannot hide it; fluid calls
  `webOSSystem.setCursorHidden(true)` whenever it comes to the foreground.
- **Language.** fluid follows the TV's UI language (`webOSSystem.locale`) and falls back
  to English. Dates come from `Intl` where the engine has the locale, otherwise from the
  names in the locale file; plural rules are fluid's own, as `Intl.PluralRules` only
  arrived in Chromium 63. To add a language, translate `src/i18n/locales/en.json` and add
  it to `LANGUAGES` and `PLURAL_RULES` in `src/i18n/index.ts`; the tests check that every
  key and placeholder is there.
- **Debugging.** A rooted TV exposes the web inspector on port 9998.

### Project layout

```
src/
  platform/    the only way to the TV: one interface, webos/ (Luna, Homebrew shell) and
               mock/ (neutral sample data for the desktop browser)
  config/      constants (app ID, key codes, timings)
  theme/       design tokens (colours, type, layout, motion) and the stylesheet
  i18n/        texts (locales/en.json, de.json), plural rules, dates via Intl with a fallback
  state/       settings: one versioned schema with migrations
  lib/         clock, ordering, tile adapters
  hooks/       remote keys, OK press/hold, clock tick, time format
  components/  Header, Clock, Row, Grid, Tile, OptionList, Glyph, Toast
  screens/     Home, Settings
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
copyright notice is kept in the licence. Bundled Preact (MIT) and the Inter typeface
(SIL OFL 1.1), and the tools used to build fluid, are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

fluid ships no third-party logos. This project is not affiliated with LG Electronics or
any app publisher; "LG" and "webOS" are trademarks of LG Electronics.

Developed with AI assistance (Claude Code), directed and tested on a real TV by the
maintainer.
