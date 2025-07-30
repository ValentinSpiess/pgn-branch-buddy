/*
 * PGN Branch Buddy – Reliable PGN-to-Tree parser
 * ------------------------------------------------
 * Uses @mliebelt/pgn-parser to create an AST that preserves every
 * Recursive-Annotation-Variation (RAV), and chess.js to validate
 * each SAN token against a real board state so illegal or "ghost"
 * moves are rejected immediately.
 *
 * Exported API
 * ------------
 *   type Node      – one position in the repertoire tree.
 *   parseGame(pgn) – returns the root Node for the first game in the PGN.
 *
 * Typical usage
 * -------------
 *   import { parseGame } from "@/utils/parsePgnService";
 *   const root = parseGame(pgnString);
 *   // root.children gives you the first ply, each node its variations, etc.
 *
 * Vitest quick-check (put in a separate *.test.ts file):
 *   import { parseGame } from "../parsePgnService";
 *   it("separates variations", () => {
 *     const root = parseGame("1.e4 (1.d4 d5 2.c4) 1...c5 (1...e5 2.Nf3 Nc6)");
 *     expect(root.children[0].children.length).toBe(2);
 *   });
 */

import { parse as parsePGN } from "@mliebelt/pgn-parser";
import { Chess } from "chess.js";

// ——— normalise every possible token shape to SAN ———
function sanFrom(token: any): string | undefined {
  if (!token) return;
  if (typeof token === "string") return token;          // legacy
  if (token.notation) {
    if (typeof token.notation === "string") return token.notation;      // ≥8.0
    if (token.notation.san)      return token.notation.san;
    if (token.notation.notation) return token.notation.notation;
  }
  return token.san || token.move;
}

const GAME_RESULTS = ["1-0", "0-1", "1/2-1/2", "*"];

/** One node (position) in the game tree. */
export interface Node {
  /** FEN of the position *before* the move is played. */
  fen: string;
  /** SAN of the move that leads from `fen` to the next position. */
  move: string;
  /** Each child array represents one variation branch. */
  children: Node[];
}

// Cleans a raw PGN so @mliebelt/pgn-parser can digest it.
function cleanPgn(raw: string): string {
  let out = raw;

  // 1. strip all well-formed { … } comments and NAGs
  out = out.replace(/\{[^}]*\}/gms, "").replace(/\$\d+/g, "");

  // 2 · handle unmatched "{"
  out = out.replace(/\{[^}]*?(?:\d+\.(?:\.\.)?)/gms, (_, m) => m); // keep the move number
  out = out.replace(/\{[^}]*$/gms, "");                            // comment that runs to EOF

  // 3. collapse any 4-plus dot sequences like "5....." → "5..."
  out = out.replace(/\.{4,}/g, "...");

  // 4. shrink double spaces
  return out.replace(/\s{2,}/g, " ").trim();
}

/**
 * Parse the **first** game found in a PGN string and return a full
 * move-/variation-tree. Throws if the PGN is empty or contains illegal SAN.
 */
export function parseGame(pgn: string): Node {
  const sanitized = cleanPgn(pgn);
  try {
    const games = parsePGN(sanitized, { startRule: "games" });
    if (!Array.isArray(games) || !games.length) throw new Error("No game object returned");
    
    const chess = new Chess();
    const root: Node = { fen: chess.fen(), move: "", children: [] };

    if (import.meta.env.DEV) console.table((games[0] as any).moves.slice(0, 8));

    buildTree((games[0] as any).moves, chess, root);
    return root;
  } catch (err) {
    // 👉 log once for easier debugging in the browser console
    console.error("PGN parse error →", err);
    console.info("=== Sanitised PGN start ===\n" + sanitized.slice(0, 400) + "…");
    throw err;               // keep existing error flow
  }
}

/** Recursively copy the PGN-AST into our own Node tree structure. */
function buildTree(
  moves: any[],
  board: Chess,
  parent: Node
): void {
  let currentParent = parent;

  for (const m of moves) {
    const san = sanFrom(m);
    if (!san || GAME_RESULTS.includes(san)) {
      // skip result tokens, comments, etc.
      continue;
    }

    // Debug logging to see what's happening
    if (import.meta.env.DEV) {
      console.log("Processing move:", { token: m, san, currentFen: board.fen() });
    }

    const nextBoard = new Chess(board.fen());
    const legal = nextBoard.move(san, { strict: true });
    if (!legal) {
      console.error("Failed move details:", { 
        san, 
        currentFen: board.fen(), 
        rawToken: m,
        legalMoves: board.moves()
      });
      throw new Error(`Illegal SAN detected: ${san}`);
    }

    const node: Node = { fen: board.fen(), move: san, children: [] };
    currentParent.children.push(node);

    // 3️⃣ Recurse into each variation branch (if any).
    if (m.variations?.length) {
      for (const variation of m.variations) {
        buildTree(variation, new Chess(nextBoard.fen()), node);
      }
    }

    // 4️⃣ Continue down the main line.
    board.load(nextBoard.fen());
    currentParent = node;
  }
}