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

1. **Output Area**: Displays text as you type on the virtual or physical
   keyboard
2. **Virtual Keyboard**: Interactive visual representation of the keyboard
   layout
3. **Layer Information**: Shows the currently active keyboard layer
4. **Load from GitHub**: Select from available Divvun keyboard repositories
5. **YAML Editor**: Paste and test custom kbdgen YAML layouts

### Loading Keyboards from GitHub

1. Select a repository from the dropdown (e.g., keyboard-sme, keyboard-fin)
2. Choose a layout file
3. Select the target platform (macOS, iOS, Android, etc.)
4. For mobile platforms, optionally select device variant (phone/tablet)

### Using the YAML Editor

1. Switch to the "YAML Editor" tab
2. Paste a kbdgen YAML layout definition
3. Select the platform to preview
4. The keyboard shows a live preview, making it easy to edit a keyboard
   definition and see the result in real time.

### Embedding Keyboards

Click the "Get Embed Code" button to copy an iframe snippet that can be embedded
in other websites. The embed URL supports these parameters:

- `kbd`: Repository/keyboard identifier
- `layout`: Layout name (without .yaml extension)
- `platform`: Target platform (macOS, iOS, android, windows, chromeOS)
- `variant`: Device variant (primary, phone, tablet)
- `interactive`: Enable/disable interaction (default: true)

Example embed URL:

```
/embed?kbd=sme&layout=se&platform=macOS&variant=primary
```

### No-JS layout picker mode

Add `&interactive=false` and simply omit `layout` to get a fully
server-rendered, JS-free embed with a **layout picker** built in — useful for
embedding documentation without needing to know a kbd's layout filenames in
advance.

```
/embed?kbd=smj&interactive=false
```

- If `layout` is present, it behaves exactly as the pinned example above (no
  picker shown).
- If `layout` is absent, every layout file in the kbd's repo is loaded and a tab
  bar appears above the keyboard letting visitors switch between them (e.g.
  `smj-NO` / `smj-SE`) — pure CSS, same mechanism as the layer tabs, no
  JavaScript or extra network requests involved in switching.
- Only layout files that support the resolved `platform` (default `macOS`) are
  offered, since a repo's "bare" layout file is sometimes mobile-only (e.g.
  `sme`'s `se.yaml` is Android/iOS-only; the desktop layouts live in
  `se-FI`/`se-NO`/`se-SE`). Mixing platforms across tabs in one picker would
  make the keyboard shape jump between tabs, so those are excluded.
- If a kbd only has one layout (the common case), no tab bar is shown at all —
  this mode is then identical to pinning that one layout explicitly.

**Recommended iframe height:** budget for one extra tab-bar row (the same height
as the existing layer tab bar) on top of the usual keyboard height whenever
`layout` is omitted, since you can't know in advance whether a given kbd will
end up with more than one layout after platform filtering.

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

## Key Components

### KeyboardViewer

The main interactive keyboard viewer with GitHub loader and YAML editor.

### KeyboardEmbed

Lightweight embeddable keyboard component for use in iframes.

### StaticKeyboardEmbed

Server-rendered, JS-free keyboard for one pinned layout, with CSS-only layer
switching (used by `/embed?...&interactive=false`).

### StaticKeyboardLayoutPicker

Wraps `StaticKeyboardEmbed` with an optional outer layout tab bar, used by
`/embed?...&interactive=false` when `layout` is omitted from the URL. Renders
`StaticKeyboardEmbed` directly with no extra chrome when only one layout is in
scope.

### KeyboardDisplay

Renders the visual keyboard layout with key state management.

### useKeyboard

Custom hook that manages keyboard state, layer switching, and key combinations.

### useKeyboardScaling

Custom hook that handles responsive scaling of the keyboard display.

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
