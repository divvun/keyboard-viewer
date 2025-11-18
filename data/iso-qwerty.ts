import type { KeyboardLayout } from "../types/keyboard-simple.ts";

/**
 * Standard ISO QWERTY keyboard layout
 */
export const isoQwertyLayout: KeyboardLayout = {
  id: "iso-qwerty",
  name: "ISO QWERTY",
  rows: [
    // Number row
    {
      keys: [
        { id: "Backquote", output: "`", width: 1.0 },
        { id: "Digit1", output: "1" },
        { id: "Digit2", output: "2" },
        { id: "Digit3", output: "3" },
        { id: "Digit4", output: "4" },
        { id: "Digit5", output: "5" },
        { id: "Digit6", output: "6" },
        { id: "Digit7", output: "7" },
        { id: "Digit8", output: "8" },
        { id: "Digit9", output: "9" },
        { id: "Digit0", output: "0" },
        { id: "Minus", output: "-" },
        { id: "Equal", output: "=" },
        { id: "Backspace", output: "\b", label: "⌫", width: 2.0, type: "modifier" },
      ],
    },
    // QWERTY row
    {
      keys: [
        { id: "Tab", output: "\t", label: "Tab", width: 1.5, type: "modifier" },
        { id: "KeyQ", output: "q" },
        { id: "KeyW", output: "w" },
        { id: "KeyE", output: "e" },
        { id: "KeyR", output: "r" },
        { id: "KeyT", output: "t" },
        { id: "KeyY", output: "y" },
        { id: "KeyU", output: "u" },
        { id: "KeyI", output: "i" },
        { id: "KeyO", output: "o" },
        { id: "KeyP", output: "p" },
        { id: "BracketLeft", output: "[" },
        { id: "BracketRight", output: "]" },
      ],
    },
    // ASDF row (with ISO Enter spanning 2 rows)
    {
      keys: [
        { id: "CapsLock", output: "", label: "Caps", width: 1.75, type: "modifier" },
        { id: "KeyA", output: "a" },
        { id: "KeyS", output: "s" },
        { id: "KeyD", output: "d" },
        { id: "KeyF", output: "f" },
        { id: "KeyG", output: "g" },
        { id: "KeyH", output: "h" },
        { id: "KeyJ", output: "j" },
        { id: "KeyK", output: "k" },
        { id: "KeyL", output: "l" },
        { id: "Semicolon", output: ";" },
        { id: "Quote", output: "'" },
        { id: "Backslash", output: "\\" },
        { id: "Enter", output: "\n", label: "↵", width: 1.25, height: 2.0, type: "modifier" },
      ],
    },
    // ZXCV row
    {
      keys: [
        { id: "ShiftLeft", output: "", label: "Shift", width: 1.25, type: "modifier" },
        { id: "IntlBackslash", output: "\\", label: "\\" }, // Extra ISO key
        { id: "KeyZ", output: "z" },
        { id: "KeyX", output: "x" },
        { id: "KeyC", output: "c" },
        { id: "KeyV", output: "v" },
        { id: "KeyB", output: "b" },
        { id: "KeyN", output: "n" },
        { id: "KeyM", output: "m" },
        { id: "Comma", output: "," },
        { id: "Period", output: "." },
        { id: "Slash", output: "/" },
        { id: "ShiftRight", output: "", label: "Shift", width: 2.75, type: "modifier" },
      ],
    },
    // Bottom row
    {
      keys: [
        { id: "ControlLeft", output: "", label: "Ctrl", width: 1.25, type: "modifier" },
        { id: "MetaLeft", output: "", label: "⌘", width: 1.25, type: "modifier" },
        { id: "AltLeft", output: "", label: "Alt", width: 1.25, type: "modifier" },
        { id: "Space", output: " ", label: "", width: 6.25, type: "space" },
        { id: "AltRight", output: "", label: "Alt", width: 1.25, type: "modifier" },
        { id: "MetaRight", output: "", label: "⌘", width: 1.25, type: "modifier" },
        { id: "ControlRight", output: "", label: "Ctrl", width: 1.25, type: "modifier" },
      ],
    },
  ],
};
