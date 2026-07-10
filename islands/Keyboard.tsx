import { Keyboard, type KeyboardProps } from "@divvun/keyboard";

/** Island wrapper — all behavior lives in components/Keyboard.tsx, which is
 * shared with other hosts (e.g. borealium) that wrap it in their own island. */
export default function KeyboardIsland(props: KeyboardProps) {
  return <Keyboard {...props} />;
}
