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
      // Clean PGN by removing variations (parentheses) and comments
      const cleanedPGN = this.cleanPGN(pgn);
      
      // Reset chess instance
      this.chess.reset();
      
      // Load the cleaned PGN
      this.chess.loadPgn(cleanedPGN);
      
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
      
    } catch (error) {
      console.error('Error parsing PGN:', error);
      // Try to extract moves manually if chess.js fails
      const manualMoves = this.extractMovesManually(pgn);
      if (manualMoves.length > 0) {
        const mainVariation: Variation = {
          id: 'main',
          name: 'Main Line',
          moves: manualMoves,
          mainline: true
        };
        variations.push(mainVariation);
      }
    }

    return variations;
  }

  private cleanPGN(pgn: string): string {
    // Remove PGN headers (everything in square brackets)
    let cleaned = pgn.replace(/\[[^\]]*\]/g, '');
    
    // Remove variations (content in parentheses) recursively
    while (/\([^()]*\)/.test(cleaned)) {
      cleaned = cleaned.replace(/\([^()]*\)/g, '');
    }
    
    // Remove comments in braces
    cleaned = cleaned.replace(/\{[^}]*\}/g, '');
    
    // Remove move number indicators like "13..." 
    cleaned = cleaned.replace(/\d+\.\.\./g, '');
    
    // Remove result indicators
    cleaned = cleaned.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');
    
    // Clean up extra whitespace and newlines
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  private extractMovesManually(pgn: string): string[] {
    const moves: string[] = [];
    
    // Remove headers, comments, and variations
    let gameText = pgn.replace(/\[[^\]]*\]/g, '');
    gameText = gameText.replace(/\{[^}]*\}/g, '');
    
    // Remove variations recursively
    while (/\([^()]*\)/.test(gameText)) {
      gameText = gameText.replace(/\([^()]*\)/g, '');
    }
    
    // Remove result indicators
    gameText = gameText.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');
    
    // Enhanced regex pattern to capture chess moves including castling and pawn captures
    const movePattern = /\d+\.?\s*((?:O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?))\s*((?:O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?))?/g;
    
    let match;
    while ((match = movePattern.exec(gameText)) !== null) {
      if (match[1] && match[1].trim()) {
        moves.push(match[1].trim());
      }
      if (match[2] && match[2].trim()) {
        moves.push(match[2].trim());
      }
    }
    
    return moves;
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