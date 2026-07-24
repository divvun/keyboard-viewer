# Divvun Keyboard Viewer

An interactive web application for visualizing and testing Divvun keyboard
layouts across multiple platforms. Built with Fresh (Deno), Preact, and Vite.

## Features

- **Interactive Keyboard Display**: Click keys or use your physical keyboard to
  test layouts
- **Multi-Platform Support**: View keyboards for macOS, iOS, Android, Windows,
  and Chrome OS
- **Device Variants**: Support for different mobile device types (phones,
  tablets)
- **GitHub Integration**: Load keyboard layouts directly from GitHub
  repositories
- **YAML Editor**: Paste and test kbdgen YAML layout definitions
- **Layer Visualization**: See different keyboard layers (default, shift, alt,
  symbols, etc.)
- **Dead Key Support**: Full support for dead key combinations
- **Embeddable**: Generate iframe code to embed keyboards in other sites
- **Responsive Design**: Works on desktop and mobile devices
- **URL Sharing**: Share specific keyboard configurations via URL parameters

## Prerequisites

Make sure to install Deno:
<https://docs.deno.com/runtime/getting_started/installation>

Copy `.env.example` to `.env` and set `GITHUB_TOKEN` to a GitHub personal access
token (no scopes needed for public repos —
<https://github.com/settings/tokens>). This app calls the GitHub API to list
keyboard repos and fetch/parse kbdgen YAML; without a token you'll hit GitHub's
unauthenticated rate limit (60 requests/hour) almost immediately during
development.

## Development

Start the project in development mode:

```bash
deno task dev
```

This will start the Vite development server and watch for changes.

## Available Commands

- `deno task dev` - Start development server
- `deno task build` - Build for production
- `deno task start` - Start production server
- `deno task prod` - Serve production build
- `deno task check` - Run linting and type checking
- `deno task ci` - Clean install dependencies
- `deno task update` - Update Fresh framework

## Usage

### Main Viewer

Navigate to the root URL to access the main keyboard viewer interface. The
viewer includes:

1. **Keyboard**: An interactive keyboard — click keys or use your physical
   keyboard to type into its built-in test area. If the loaded kbd has more than
   one layout file, platform, device variant, or layer, the keyboard itself
   grows the matching tab bar(s) for switching between them; there's no separate
   selection UI for these.
2. **Load from GitHub**: Pick which Divvun keyboard repository to view — the
   only choice made outside the keyboard itself
3. **YAML Editor**: Paste and test custom kbdgen YAML layouts

### Loading Keyboards from GitHub

1. Select a language from the dropdown (e.g., keyboard-sme, keyboard-fin)
2. The keyboard above updates to that repo's combo tree — switch between its
   layout files, platforms, device variants, and layers using the keyboard's own
   tab bars
3. Once you're showing the combination you want, click "Get Embed Code" to copy
   an iframe snippet for it

### Using the YAML Editor

1. Switch to the "YAML Editor" tab
2. Paste a kbdgen YAML layout definition
3. The keyboard above shows a live preview as you type, with its usual tab bars
   for any platforms/variants/layers the pasted YAML declares

### Embedding Keyboards

Click the "Get Embed Code" button to copy an iframe snippet that can be embedded
in other websites. The embed URL supports these parameters:

- `kbd`: Repository/keyboard identifier
- `layout`: Layout name (without .yaml extension)
- `platform`: Target platform (macOS, iOS, android, windows, chromeOS)
- `variant`: Device variant (primary, phone, tablet)
- `interactive`: Enable/disable interaction (default: true)
- `input`: Show/hide the click/type test textarea (default: true). Only
  meaningful when `interactive=true` — the no-JS static embed never renders one
  regardless.

Example embed URL:

```
/embed?kbd=sme&layout=se&platform=macOS&variant=primary
```

### No-JS layout and platform picker mode

Add `&interactive=false` and omit `layout`, `platform`, and/or `variant` to get
a fully server-rendered, JS-free embed with tab-bar pickers built in for
whichever of the three you leave out — useful for embedding documentation
without needing to know a kbd's layout filenames, supported platforms, or device
variants in advance.

```
/embed?kbd=smj&interactive=false
```

**Rule:** each of `layout`, `platform`, and `variant` is independent. If
present, it's pinned (no tab bar for that dimension, exactly like the pinned
example above). If absent, every option for that dimension is loaded and a
CSS-only tab bar appears — no JavaScript or extra network requests involved in
switching, same mechanism as the layer tabs.

- **`layout` absent:** every layout file in the kbd's repo is loaded (e.g.
  `smj-NO` / `smj-SE`).
  - If `platform` is _also_ pinned, only layout files that support that platform
    are offered — a repo's "bare" layout file is sometimes mobile-only (e.g.
    `sme`'s `se.yaml` is Android/iOS-only; the desktop layouts live in
    `se-FI`/`se-NO`/`se-SE`), and mixing platforms across tabs in one picker
    would make the keyboard shape jump between tabs.
  - If `platform` is _also_ absent, each layout tab shows whichever platforms
    _that specific file_ declares, independently — switching layout can change
    which platform tabs are available, since each layout's platform picker is
    self-contained.
- **`platform` absent:** every platform the resolved layout declares is loaded
  (macOS/Windows/iOS/Android/Chrome OS, whichever apply) as its own tab.
  - ⚠️ **Compatibility note:** previously, omitting `platform` silently
    defaulted to macOS only. It now shows a picker for every platform the layout
    declares. If you want today's old macOS-only behavior, pass `platform=macOS`
    explicitly.
- **`variant` absent:** only matters for mobile platforms (iOS, Android) that
  declare more than one device variant — e.g. iOS's Primary/iPad-9in/iPad-12in,
  Android's Primary/Tablet-600. Desktop platforms always have exactly one
  variant, so this tab bar only appears once a multi-variant mobile platform is
  the checked (or pinned) one.
- If a kbd only has one layout, a layout only has one platform, or a platform
  only has one variant, no tab bar is shown for that dimension at all — this
  mode then collapses toward the fully-pinned example above.

Tab bars are deliberately **not** scaled down along with the keyboard — they're
UI chrome, and shrinking them together with a width-constrained keyboard made
them inconsistent in size and less obviously clickable. Only the keyboard
key-grid itself scales to fit `width`; every tab bar (layer, platform, layout,
variant) always renders at full size.

**Recommended iframe height:** budget for one full, fixed-size tab-bar row
(layer tabs are always present) plus one more _per additional dimension_ left
unpinned (layout, platform, variant) — up to four tab-bar rows stacked above the
(possibly scaled-down) keyboard, e.g. when `layout`/`platform`/`variant` are all
omitted and the checked layout+platform combo turns out to be a multi-variant
mobile one, since you can't know in advance how many options any dimension will
end up with. If your embedding context can run JavaScript, read
`data-embed-height` off the response instead of hardcoding a budget — it's
exact, and the embed also self-corrects via a `postMessage` resize event as a
progressive enhancement on top.

### URL Parameters

You can share specific keyboard configurations by including URL parameters:

```
/?kbd=sme&layout=se&platform=macOS&variant=primary
```

## Technology Stack

- **Framework**: Fresh 2.x (Deno web framework)
- **Runtime**: Deno
- **UI Library**: Preact
- **State Management**: @preact/signals
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind-style CSS (not actually Tailwind)
- **Data Format**: kbdgen YAML layouts

## Package Structure

The keyboard itself — rendering, kbdgen parsing/transforms, and the tab-bar
picker components — lives in `packages/keyboard`, a Deno workspace member
published as `@divvun/keyboard` (see its `deno.json`). It's built to be reusable
outside this app: it has no dependency on Fresh, exposes its public API through
`mod.ts`, and ships its stylesheet as the `keyboardCss` string export (JSR can't
publish a raw `.css` file as a module, so it's generated from `keyboard.css` by
`scripts/generate-css-module.ts` — run that task after editing styles, before
publishing). Other sites (e.g. borealium.org) consume it directly rather than
going through `keyboard-viewer`'s own routes/islands, which are just one
consumer of it — the app-level `routes/`, `islands/`, and `components/`
directories hold everything specific to _this_ site (the GitHub/YAML-editor
page, the `/embed` route, the GitHub API proxy routes).

## Key Components

### KeyboardViewer

The root page's island: the always-visible `KeyboardPicker`, the "Load from
GitHub" / "YAML Editor" tab switcher, and the "Get Embed Code" button.

### GitHubKeyboardSelector

Picks which `keyboard-xxx` GitHub repo to view — nothing else. Once a repo is
chosen, `KeyboardPicker` owns layout/platform/variant/layer selection itself via
its own tab bars.

### KeyboardPicker (`@divvun/keyboard`)

Hydratable renderer for the full layout → platform → variant → layer tab tree:
server-rendered as a complete zero-JS keyboard (every combo pre-rendered,
switched by CSS-only radio tabs), then hydrated to wire up click/hardware typing
and a live test textarea. Used directly wherever more than one
layout/platform/variant might need to be shown (`KeyboardViewer`, the
interactive `/embed` island when hydrated).

### Keyboard (`@divvun/keyboard`)

A thin wrapper over `KeyboardPicker` with a single-entry combo — use this when
you already know exactly which layout/platform/variant to show and only need
layer tabs, e.g. `/embed`'s pinned interactive path.

### CssTabPicker (`@divvun/keyboard`)

The generic CSS-only (no JS) radio-driven tab bar shared by every dimension —
layer, platform, layout, and variant tabs are all one `CssTabPicker` under the
hood, parameterized by dimension name.

### StaticKeyboardLayoutPicker / StaticKeyboardPlatformPicker / StaticKeyboardVariantPicker (`@divvun/keyboard`)

The no-JS picker tree used by `/embed?...&interactive=false`, nested in that
order (layout → platform → variant), each wrapping the next with an optional tab
bar for its own dimension — omitted entirely when only one option is in scope.
See "No-JS layout and platform picker mode" above for the full behavior.

### StaticKeyboardEmbed (`@divvun/keyboard`)

The innermost piece of that tree: one pinned layout/platform/variant,
server-rendered with CSS-only layer switching, no JS required.

### KeyboardDisplay (`@divvun/keyboard`)

Renders the visual keyboard layout with key state management.

## Supported Platforms

- **macOS**: Desktop keyboard layouts
- **iOS**: iPhone and iPad virtual keyboards
- **Android**: Mobile virtual keyboards
- **Windows**: Desktop keyboard layouts
- **Chrome OS**: Chromebook keyboard layouts

## kbdgen Format

This viewer supports keyboard layouts defined in the kbdgen YAML format used by
Divvun. Each layout can define multiple modes (layers) and supports:

- Dead keys and combining characters
- Multiple keyboard layers (default, shift, alt, caps, symbols)
- Platform-specific layouts
- Device-specific variants
- Transform rules for complex input

## License

This project is licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or
  <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or
  <http://opensource.org/licenses/MIT>)

at your option.
