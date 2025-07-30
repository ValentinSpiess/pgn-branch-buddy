// Utility to convert tree-based Node structure to legacy Variation format
// for compatibility with existing components during migration

import { Node } from "./parsePgnService";
import { Chess } from "chess.js";

export interface Variation {
  id: string;
  name: string;
  moves: string[];
  mainline: boolean;
}

export interface TrainingPosition {
  fen: string;
  moveToMake: string;
  responseMove?: string;
  description: string;
}

let variationCounter = 0;

export function extractVariationsFromTree(root: Node): Variation[] {
  const variations: Variation[] = [];
  variationCounter = 0;
  
  // Extract main line
  const mainLine = extractMainLine(root);
  if (mainLine.length > 0) {
    variations.push({
      id: `variation-${++variationCounter}`,
      name: `Main Line`,
      moves: mainLine,
      mainline: true
    });
  }
  
  // Extract all side variations
  extractSideVariations(root, [], variations);
  
  return variations;
}

function extractMainLine(node: Node): string[] {
  const moves: string[] = [];
  let current = node;
  
  while (current.children.length > 0) {
    // Follow the first child (main line)
    current = current.children[0];
    moves.push(current.move);
  }
  
  return moves;
}

function extractSideVariations(node: Node, pathMoves: string[], variations: Variation[]): void {
  // If this node has multiple children, each additional child is a variation
  if (node.children.length > 1) {
    for (let i = 1; i < node.children.length; i++) {
      const variationMoves = [...pathMoves];
      const variationRoot = node.children[i];
      
      // Add the variation's moves
      collectMovesFromBranch(variationRoot, variationMoves);
      
      if (variationMoves.length > 0) {
        variations.push({
          id: `variation-${++variationCounter}`,
          name: `Variation ${variationCounter}`,
          moves: variationMoves,
          mainline: false
        });
      }
    }
  }
  
  // Continue down the main line
  if (node.children.length > 0) {
    const newPath = [...pathMoves];
    if (node.children[0].move) {
      newPath.push(node.children[0].move);
    }
    extractSideVariations(node.children[0], newPath, variations);
  }
}

function collectMovesFromBranch(node: Node, moves: string[]): void {
  moves.push(node.move);
  
  // Follow the main branch of this variation
  if (node.children.length > 0) {
    collectMovesFromBranch(node.children[0], moves);
  }
}

export function createTrainingPositions(variation: Variation, userColor: 'white' | 'black'): TrainingPosition[] {
  const positions: TrainingPosition[] = [];
  
  // Simple implementation - create positions where user makes every other move
  const isUserWhite = userColor === 'white';
  
  for (let i = 0; i < variation.moves.length; i++) {
    const isWhiteMove = i % 2 === 0;
    
    if ((isUserWhite && isWhiteMove) || (!isUserWhite && !isWhiteMove)) {
      // This is a move the user should make
      const moveToMake = variation.moves[i];
      const responseMove = i + 1 < variation.moves.length ? variation.moves[i + 1] : undefined;
      
      positions.push({
        fen: calculateFenAtMove(variation.moves, i),
        moveToMake,
        responseMove,
        description: `Move ${Math.floor(i / 2) + 1}: Play ${moveToMake}`
      });
    }
  }
  
  return positions;
}

function calculateFenAtMove(moves: string[], moveIndex: number): string {
  // Calculate actual FEN by playing moves
  const chess = new Chess();
  
  for (let i = 0; i < moveIndex; i++) {
    try {
      chess.move(moves[i]);
    } catch (error) {
      console.error(`Error applying move ${i}: ${moves[i]}`, error);
      break;
    }
  }
  
  return chess.fen();
}