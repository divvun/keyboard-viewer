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
        { id: "Backquote", output: "`", shiftOutput: "¬", width: 1.0 },
        { id: "Digit1", output: "1", shiftOutput: "!" },
        { id: "Digit2", output: "2", shiftOutput: "\"" },
        { id: "Digit3", output: "3", shiftOutput: "£" },
        { id: "Digit4", output: "4", shiftOutput: "$" },
        { id: "Digit5", output: "5", shiftOutput: "%" },
        { id: "Digit6", output: "6", shiftOutput: "^" },
        { id: "Digit7", output: "7", shiftOutput: "&" },
        { id: "Digit8", output: "8", shiftOutput: "*" },
        { id: "Digit9", output: "9", shiftOutput: "(" },
        { id: "Digit0", output: "0", shiftOutput: ")" },
        { id: "Minus", output: "-", shiftOutput: "_" },
        { id: "Equal", output: "=", shiftOutput: "+" },
        {
          id: "Backspace",
          output: "\b",
          label: "⌫",
          width: 2.0,
          type: "modifier",
        },
      ],
    },
    // QWERTY row
    {
      keys: [
        { id: "Tab", output: "\t", label: "Tab", width: 1.5, type: "modifier" },
        { id: "KeyQ", output: "q", shiftOutput: "Q" },
        { id: "KeyW", output: "w", shiftOutput: "W" },
        { id: "KeyE", output: "e", shiftOutput: "E" },
        { id: "KeyR", output: "r", shiftOutput: "R" },
        { id: "KeyT", output: "t", shiftOutput: "T" },
        { id: "KeyY", output: "y", shiftOutput: "Y" },
        { id: "KeyU", output: "u", shiftOutput: "U" },
        { id: "KeyI", output: "i", shiftOutput: "I" },
        { id: "KeyO", output: "o", shiftOutput: "O" },
        { id: "KeyP", output: "p", shiftOutput: "P" },
        { id: "BracketLeft", output: "[", shiftOutput: "{" },
        { id: "BracketRight", output: "]", shiftOutput: "}" },
        {
          id: "Enter",
          output: "\n",
          label: "Enter",
          width: 1.3,
          height: 2.075,
          type: "enter",
        },
      ],
    },
    // ASDF row (with ISO Enter spanning 2 rows)
    {
      keys: [
        {
          id: "CapsLock",
          output: "",
          label: "Caps",
          width: 1.75,
          type: "modifier",
        },
        { id: "KeyA", output: "a", shiftOutput: "A" },
        { id: "KeyS", output: "s", shiftOutput: "S" },
        { id: "KeyD", output: "d", shiftOutput: "D" },
        { id: "KeyF", output: "f", shiftOutput: "F" },
        { id: "KeyG", output: "g", shiftOutput: "G" },
        { id: "KeyH", output: "h", shiftOutput: "H" },
        { id: "KeyJ", output: "j", shiftOutput: "J" },
        { id: "KeyK", output: "k", shiftOutput: "K" },
        { id: "KeyL", output: "l", shiftOutput: "L" },
        { id: "Semicolon", output: ";", shiftOutput: ":" },
        { id: "Quote", output: "'", shiftOutput: "@" },
        { id: "Backslash", output: "\\", shiftOutput: "~", label: "#", shiftLabel: "~" },
      ],
    },
    // ZXCV row
    {
      keys: [
        {
          id: "ShiftLeft",
          output: "",
          label: "Shift",
          width: 1.25,
          type: "modifier",
        },
        { id: "IntlBackslash", output: "\\", shiftOutput: "|", label: "\\", shiftLabel: "|" }, // Extra ISO key
        { id: "KeyZ", output: "z", shiftOutput: "Z" },
        { id: "KeyX", output: "x", shiftOutput: "X" },
        { id: "KeyC", output: "c", shiftOutput: "C" },
        { id: "KeyV", output: "v", shiftOutput: "V" },
        { id: "KeyB", output: "b", shiftOutput: "B" },
        { id: "KeyN", output: "n", shiftOutput: "N" },
        { id: "KeyM", output: "m", shiftOutput: "M" },
        { id: "Comma", output: ",", shiftOutput: "<" },
        { id: "Period", output: ".", shiftOutput: ">" },
        { id: "Slash", output: "/", shiftOutput: "?" },
        {
          id: "ShiftRight",
          output: "",
          label: "Shift",
          width: 2.75,
          type: "modifier",
        },
      ],
    },
    // Bottom row
    {
      keys: [
        {
          id: "ControlLeft",
          output: "",
          label: "Ctrl",
          width: 1.25,
          type: "modifier",
        },
        {
          id: "MetaLeft",
          output: "",
          label: "⌘",
          width: 1.25,
          type: "modifier",
        },
        {
          id: "AltLeft",
          output: "",
          label: "Alt",
          width: 1.25,
          type: "modifier",
        },
        { id: "Space", output: " ", label: "", width: 6.25, type: "space" },
        {
          id: "AltRight",
          output: "",
          label: "Alt",
          width: 1.25,
          type: "modifier",
        },
        {
          id: "MetaRight",
          output: "",
          label: "⌘",
          width: 1.25,
          type: "modifier",
        },
        {
          id: "ControlRight",
          output: "",
          label: "Ctrl",
          width: 1.25,
          type: "modifier",
        },
      ],
    },
  ],
};
