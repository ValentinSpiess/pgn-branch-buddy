import { Chess } from "chess.js";

export interface Variation {
  id: string;
  name: string;
  moves: string[];
  description?: string;
  mainline: boolean;
}

export interface TrainingPosition {
  id: string;
  variationId: string;
  fen: string;
  moveToMake: string;
  responseMove?: string;
  moveNumber: number;
  description?: string;
}

export class PGNParser {
  private chess: Chess;

  constructor() {
    this.chess = new Chess();
  }

  parsePGN(pgn: string): Variation[] {
    const variations: Variation[] = [];
    
    try {
      // Reset chess instance
      this.chess.reset();
      
      // Load the PGN
      this.chess.loadPgn(pgn);
      
      // Extract mainline
      const history = this.chess.history({ verbose: true });
      if (history.length > 0) {
        const mainVariation: Variation = {
          id: 'main',
          name: 'Main Line',
          moves: history.map(move => move.san),
          mainline: true
        };
        variations.push(mainVariation);
      }

      // For now, we'll focus on the main line
      // In a more advanced version, we'd parse variations from PGN comments
      
    } catch (error) {
      console.error('Error parsing PGN:', error);
    }

    return variations;
  }

  createTrainingPositions(variation: Variation, userColor: 'white' | 'black'): TrainingPosition[] {
    const positions: TrainingPosition[] = [];
    this.chess.reset();

    for (let i = 0; i < variation.moves.length; i++) {
      const moveNumber = Math.floor(i / 2) + 1;
      const isUserMove = (userColor === 'white' && i % 2 === 0) || 
                        (userColor === 'black' && i % 2 === 1);

      if (isUserMove && i < variation.moves.length - 1) {
        // This is a position where the user should make a move
        const position: TrainingPosition = {
          id: `${variation.id}-${i}`,
          variationId: variation.id,
          fen: this.chess.fen(),
          moveToMake: variation.moves[i],
          responseMove: variation.moves[i + 1],
          moveNumber,
          description: `Move ${moveNumber}${userColor === 'white' ? '' : '...'}`
        };
        positions.push(position);
      }

      // Make the move
      try {
        this.chess.move(variation.moves[i]);
      } catch (error) {
        console.error(`Invalid move: ${variation.moves[i]}`, error);
        break;
      }
    }

    return positions;
  }

  // Helper method to validate a move
  validateMove(fen: string, move: string): boolean {
    try {
      this.chess.load(fen);
      const result = this.chess.move(move);
      return result !== null;
    } catch {
      return false;
    }
  }
}