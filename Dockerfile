FROM denoland/deno:latest AS builder
WORKDIR /app
COPY deno.json deno.lock ./
RUN deno install
COPY . .
RUN deno task build

FROM denoland/deno:latest
WORKDIR /app
COPY --from=builder /app/_fresh ./_fresh
COPY --from=builder /app/static ./static
COPY --from=builder /app/deno.json ./deno.json
COPY --from=builder /app/deno.lock ./deno.lock
EXPOSE 8000
CMD ["deno", "serve", "-A", "_fresh/server.js"]
