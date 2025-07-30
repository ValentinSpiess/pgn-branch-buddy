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

// add helper at top of file
function getSan(m: any): string {
  return (
    // new parser shape (>=8.0)
    m.notation?.san ||
    m.notation?.notation ||
    // older shape
    m.move ||
    m.san ||
    // fallback for corner-cases
    (typeof m === "string" ? m : "")
  );
}

/** One node (position) in the game tree. */
export interface Node {
  /** FEN of the position *before* the move is played. */
  fen: string;
  /** SAN of the move that leads from `fen` to the next position. */
  move: string;
  /** Each child array represents one variation branch. */
  children: Node[];
}

/**
 * Parse the **first** game found in a PGN string and return a full
 * move-/variation-tree. Throws if the PGN is empty or contains illegal SAN.
 */
export function parseGame(pgn: string): Node {
  const games = parsePGN(pgn, { startRule: "games" });
  if (!Array.isArray(games) || !games.length) throw new Error("No game found in PGN string.");

  const chess = new Chess();
  const root: Node = { fen: chess.fen(), move: "", children: [] };

  buildTree((games[0] as any).moves, chess, root);
  return root;
}

/** Recursively copy the PGN-AST into our own Node tree structure. */
function buildTree(
  moves: any[],
  board: Chess,
  parent: Node
): void {
  let currentParent = parent;

  for (const m of moves) {
    // 1️⃣ Advance a *copy* of the current board so sibling branches stay isolated.
    const nextBoard = new Chess(board.fen());
    const san = getSan(m);
    if (!san) throw new Error("Move token missing SAN");

    const legal = nextBoard.move(san, { strict: true });
    if (!legal) throw new Error(`Illegal SAN detected: ${san}`);

    // 2️⃣ Create the node for this move.
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