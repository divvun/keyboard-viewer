import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import KeyboardViewer from "../islands/KeyboardViewer.tsx";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import defaultLayout from "../data/layouts/iso-qwerty.json" with { type: "json" };

export default define.page(function Home() {
  // Use embedded default QWERTY layout
  const layouts: KeyboardLayout[] = [defaultLayout as KeyboardLayout];

  return (
    <div class="px-2 py-4 md:px-4 md:py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>Keyboard Viewer</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-4 md:mb-8">
          <h1 class="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
            Divvun Keyboard Viewer
          </h1>
          <p class="text-sm md:text-base text-gray-600">
            Click keys or use your keyboard to type into the text area
          </p>
        </div>

        <KeyboardViewer layouts={layouts} />
      </div>
    </div>
  );
});
