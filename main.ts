// One Emoji, One Dream Vacation — entry writer, program/v1.
// Node 22, standard library only, no network. Writes one emoji to
// $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt) and
// proves the bytes on disk are exactly the emoji it meant to write.
//
// The gate, from the kit: /output/entry.txt must be UTF-8 text of
// 1 to 8 characters, not only white space. The judge then reads the
// file as a single emoji. Every check below mirrors that gate, and
// each failure names the rule it breaks.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The entry: a desert island. One palm, one scrap of sand, nothing
// else on the horizon — the whole dream vacation in a single picture:
// far away, warm, and with nowhere left to be. U+FE0F pins the island
// to emoji presentation so it reads as a picture, not a text glyph,
// on every screen.
const ENTRY = "🏝️";

// Gate window, in characters.
const MIN_CHARS = 1;
const MAX_CHARS = 8;

function fail(message: string): never {
  throw new Error(`entry rejected: ${message}`);
}

interface Shape {
  codePoints: number;
  codeUnits: number;
  bytes: number;
  graphemes: number;
}

// Measure the entry the way every plausible counter would: code
// points, UTF-16 code units, UTF-8 bytes, and grapheme clusters.
function measure(text: string): Shape {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return {
    codePoints: Array.from(text).length,
    codeUnits: text.length,
    bytes: Buffer.byteLength(text, "utf8"),
    graphemes: [...segmenter.segment(text)].length,
  };
}

function checkGate(text: string, shape: Shape): void {
  // 1 to 8 characters: the gate's own window, checked in both code
  // points and code units so no counting method can push it out.
  if (shape.codePoints < MIN_CHARS || shape.codePoints > MAX_CHARS) {
    fail(`must be ${MIN_CHARS} to ${MAX_CHARS} characters, got ${shape.codePoints}`);
  }
  if (shape.codeUnits < MIN_CHARS || shape.codeUnits > MAX_CHARS) {
    fail(`must be ${MIN_CHARS} to ${MAX_CHARS} code units, got ${shape.codeUnits}`);
  }

  // Not only white space — and no white space at all: a stray space
  // or newline would be a second character the judge has to read.
  if (text.trim().length === 0) fail("must not be only white space");
  if (/\s/.test(text)) fail("must contain no white space");

  // Exactly one emoji: a single grapheme cluster, and that cluster
  // must be pictographic. No words, no digits, no second symbol
  // hiding beside it.
  if (shape.graphemes !== 1) {
    fail(`must be exactly one emoji, found ${shape.graphemes} grapheme(s)`);
  }
  if (!/\p{Extended_Pictographic}/u.test(text)) {
    fail("must be an emoji");
  }

  // Every code point must be the pictograph itself or the variation
  // selector that pins its presentation — no zero-width joiner, no
  // invisible tag, nothing smuggled in beside the emoji.
  for (const ch of text) {
    if (ch !== "\uFE0F" && !/\p{Extended_Pictographic}/u.test(ch)) {
      fail(`unexpected code point U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`);
    }
  }
}

function main(): void {
  const shape = measure(ENTRY);
  checkGate(ENTRY, shape);
  console.log(
    `entry passes the gate: ${shape.codePoints} code point(s), ` +
      `${shape.codeUnits} code unit(s), ${shape.bytes} byte(s), ` +
      `${shape.graphemes} grapheme(s)`,
  );

  const folder = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(folder, { recursive: true });
  const target = join(folder, "entry.txt");
  writeFileSync(target, ENTRY, "utf8");

  // Read it straight back: what the judge sees must be what we wrote,
  // down to the last byte.
  const back = readFileSync(target, "utf8");
  if (back !== ENTRY) fail(`${target} does not match the entry`);
  if (statSync(target).size !== shape.bytes) {
    fail(`${target} is ${statSync(target).size} bytes, expected ${shape.bytes}`);
  }
  console.log(`wrote ${target} (${shape.bytes} bytes, verified)`);
  console.log(ENTRY);
}

main();
