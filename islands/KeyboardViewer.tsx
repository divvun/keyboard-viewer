import { useSignal } from "@preact/signals";
import type { KeyboardLayout, Key } from "../types/keyboard-simple.ts";
import { KeyboardLayout as KeyboardLayoutComponent } from "../components/KeyboardLayout.tsx";

interface KeyboardViewerProps {
  layout: KeyboardLayout;
}

export default function KeyboardViewer({ layout }: KeyboardViewerProps) {
  const text = useSignal("");

  const handleKeyClick = (key: Key) => {
    // Handle special keys
    if (key.id === "Backspace") {
      // Remove last character
      text.value = text.value.slice(0, -1);
      return;
    }

    if (key.id === "Enter") {
      // Add newline
      text.value += "\n";
      return;
    }

    if (key.id === "Tab") {
      // Add tab
      text.value += "\t";
      return;
    }

    // Ignore modifier keys that don't produce output
    if (!key.output || key.output === "") {
      return;
    }

    // Add the character to the text
    text.value += key.output;
  };

  const handleClear = () => {
    text.value = "";
  };

  return (
    <div class="flex flex-col gap-6">
      {/* Output text area */}
      <div class="w-full">
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-semibold text-gray-700">
            Output
          </label>
          <button
            onClick={handleClear}
            class="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear
          </button>
        </div>
        <textarea
          value={text.value}
          onInput={(e) => {
            text.value = (e.target as HTMLTextAreaElement).value;
          }}
          class="w-full h-32 p-3 border-2 border-gray-300 rounded font-mono text-sm resize-y focus:outline-none focus:border-blue-500"
          placeholder="Click keys on the keyboard below to type..."
        />
      </div>

      {/* Keyboard */}
      <div class="flex justify-center">
        <KeyboardLayoutComponent layout={layout} onKeyClick={handleKeyClick} />
      </div>

      {/* Info */}
      <div class="text-center text-sm text-gray-600">
        <p>Layout: <strong>{layout.name}</strong></p>
        <p class="text-xs mt-1">Click keys to type, or type directly in the text area</p>
      </div>
    </div>
  );
}
