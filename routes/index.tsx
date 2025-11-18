import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import KeyboardViewer from "../islands/KeyboardViewer.tsx";
import { isoQwertyLayout } from "../data/iso-qwerty.ts";

export default define.page(function Home() {
  return (
    <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>Keyboard Viewer</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">
            Interactive Keyboard Viewer
          </h1>
          <p class="text-gray-600">
            Click keys on the keyboard to type into the text area
          </p>
        </div>

        <KeyboardViewer layout={isoQwertyLayout} />
      </div>
    </div>
  );
});
