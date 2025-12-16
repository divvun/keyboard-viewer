import { PageProps } from "$fresh/server.ts";
import { KeyboardEmbed } from "../islands/KeyboardEmbed.tsx";
import { parseKeyboardParams } from "../utils/keyboard-params.ts";

export default function EmbedPage({ url }: PageProps) {
  const params = parseKeyboardParams(url.searchParams);
  const interactive = url.searchParams.get("interactive") !== "false"; // default true

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Keyboard: {params.kbd} - {params.layout}</title>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: transparent;
          }
        `}</style>
      </head>
      <body>
        <KeyboardEmbed
          kbd={params.kbd}
          layout={params.layout}
          platform={params.platform}
          variant={params.variant}
          interactive={interactive}
        />
      </body>
    </html>
  );
}
