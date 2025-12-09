import { PageProps } from "$fresh/server.ts";
import { KeyboardEmbed } from "../islands/KeyboardEmbed.tsx";

export default function EmbedPage({ url }: PageProps) {
  const params = url.searchParams;

  const kbd = params.get("kbd") || "sme";
  const layout = params.get("layout") || "se";
  const platform = params.get("platform") || "macOS";
  const variant = params.get("variant") || "primary";
  const interactive = params.get("interactive") !== "false"; // default true

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Keyboard: {kbd} - {layout}</title>
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
          kbd={kbd}
          layout={layout}
          platform={platform}
          variant={variant}
          interactive={interactive}
        />
      </body>
    </html>
  );
}
