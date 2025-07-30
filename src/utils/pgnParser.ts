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
      // Clean the PGN first
      const cleanedPgn = this.cleanPGNForParsing(pgn);
      
      // Parse variations with proper branching
      const allVariations = this.extractVariationsWithBranching(cleanedPgn);
      variations.push(...allVariations);
      
    } catch (error) {
      console.error('Error parsing PGN:', error);
      // Fallback to manual extraction
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

  private cleanPGNForParsing(pgn: string): string {
    // Remove PGN headers
    let cleaned = pgn.replace(/\[[^\]]*\]/g, '');
    
    // Remove comments in braces
    cleaned = cleaned.replace(/\{[^}]*\}/g, '');
    
    // Remove Lichess annotations like [%cal ...]
    cleaned = cleaned.replace(/\[%[^\]]*\]/g, '');
    
    // Remove result indicators
    cleaned = cleaned.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  private extractVariationsWithBranching(gameText: string): Variation[] {
    const variations: Variation[] = [];
    const parsedVariations = this.parseVariationTree(gameText);
    
    // Convert parsed tree to flat variations
    this.flattenVariations(parsedVariations.mainLine, parsedVariations.variations, [], variations);
    
    return variations;
  }

  private parseVariationTree(text: string): { mainLine: string[], variations: Array<{ startIndex: number, moves: string[], subVariations: any[] }> } {
    const tokens = this.tokenizePGN(text);
    const result = this.parseTokens(tokens);
    return result;
  }

  private tokenizePGN(text: string): Array<{ type: 'move' | 'open' | 'close', value: string, position: number }> {
    const tokens: Array<{ type: 'move' | 'open' | 'close', value: string, position: number }> = [];
    let i = 0;
    
    while (i < text.length) {
      if (text[i] === '(') {
        tokens.push({ type: 'open', value: '(', position: i });
        i++;
      } else if (text[i] === ')') {
        tokens.push({ type: 'close', value: ')', position: i });
        i++;
      } else if (text[i] === ' ') {
        i++;
      } else {
        // Parse move
        const moveMatch = text.slice(i).match(/^(\d+\.{1,3}\s*)?((?:O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?))/);
        if (moveMatch) {
          tokens.push({ type: 'move', value: moveMatch[2], position: i });
          i += moveMatch[0].length;
        } else {
          i++;
        }
      }
    }
    
    return tokens;
  }

  private parseTokens(tokens: Array<{ type: 'move' | 'open' | 'close', value: string, position: number }>): { mainLine: string[], variations: Array<{ startIndex: number, moves: string[], subVariations: any[] }> } {
    const mainLine: string[] = [];
    const variations: Array<{ startIndex: number, moves: string[], subVariations: any[] }> = [];
    let i = 0;
    
    while (i < tokens.length) {
      if (tokens[i].type === 'move') {
        mainLine.push(tokens[i].value);
        i++;
      } else if (tokens[i].type === 'open') {
        // Start of variation - it branches from current position in main line
        const branchPoint = mainLine.length;
        const variationResult = this.parseVariation(tokens, i + 1);
        variations.push({
          startIndex: branchPoint,
          moves: variationResult.moves,
          subVariations: variationResult.subVariations
        });
        i = variationResult.endIndex;
        // After variation closes, continue with main line
      } else {
        i++;
      }
    }
    
    return { mainLine, variations };
  }

  private parseVariation(tokens: Array<{ type: 'move' | 'open' | 'close', value: string, position: number }>, startIndex: number): { moves: string[], subVariations: any[], endIndex: number } {
    const moves: string[] = [];
    const subVariations: any[] = [];
    let i = startIndex;
    let depth = 1;
    
    while (i < tokens.length && depth > 0) {
      if (tokens[i].type === 'move') {
        moves.push(tokens[i].value);
        i++;
      } else if (tokens[i].type === 'open') {
        // Sub-variation within this variation
        const subBranchPoint = moves.length;
        depth++;
        const subResult = this.parseVariation(tokens, i + 1);
        subVariations.push({
          startIndex: subBranchPoint,
          moves: subResult.moves,
          subVariations: subResult.subVariations
        });
        i = subResult.endIndex;
        depth--;
      } else if (tokens[i].type === 'close') {
        depth--;
        i++;
      } else {
        i++;
      }
    }
    
    return { moves, subVariations, endIndex: i };
  }

  private flattenVariations(
    parentMoves: string[], 
    variations: Array<{ startIndex: number, moves: string[], subVariations: any[] }>, 
    currentPath: string[], 
    result: Variation[]
  ): void {
    // Add main line only at top level
    if (currentPath.length === 0) {
      result.push({
        id: 'main',
        name: 'Main Line',
        moves: [...parentMoves],
        mainline: true
      });
    }
    
    // Process each variation
    variations.forEach((variation, index) => {
      // Build complete variation: parent moves up to branch point + variation moves
      const completeMoves = [
        ...parentMoves.slice(0, variation.startIndex),
        ...variation.moves
      ];
      
      const variationId = currentPath.length === 0 ? `variation-${index + 1}` : `${currentPath.join('-')}-${index + 1}`;
      const variationName = this.generateVariationName(variation.moves, index + 1);
      
      result.push({
        id: variationId,
        name: variationName,
        moves: completeMoves,
        mainline: false
      });
      
      // Recursively process sub-variations
      if (variation.subVariations.length > 0) {
        this.flattenVariations(
          completeMoves,
          variation.subVariations,
          [...currentPath, `variation-${index + 1}`],
          result
        );
      }
    });
  }

  private generateVariationName(moves: string[], index: number): string {
    if (moves.length === 0) return `Variation ${index}`;
    
    // Use first few moves to create descriptive name
    const firstMoves = moves.slice(0, 3).join(' ');
    return `${index}. ${firstMoves}${moves.length > 3 ? '...' : ''}`;
  }

  private extractMainLine(gameText: string): string[] {
    // Remove all variations to get just the main line
    let mainLine = gameText;
    while (/\([^()]*\)/.test(mainLine)) {
      mainLine = mainLine.replace(/\([^()]*\)/g, '');
    }
    
    return this.parseMovesFromText(mainLine);
  }

  private extractVariations(gameText: string): string[][] {
    const variations: string[][] = [];
    const variationRegex = /\(([^()]+)\)/g;
    
    let match;
    while ((match = variationRegex.exec(gameText)) !== null) {
      const variationText = match[1];
      const moves = this.parseMovesFromText(variationText);
      if (moves.length > 0) {
        variations.push(moves);
      }
    }
    
    // Handle nested variations by recursively processing
    const nestedVariationRegex = /\([^()]*\([^()]*\)[^()]*\)/g;
    if (nestedVariationRegex.test(gameText)) {
      let processedText = gameText;
      while (/\([^()]*\([^()]*\)[^()]*\)/.test(processedText)) {
        processedText = processedText.replace(/\(([^()]*)\)/g, (match, content) => {
          const moves = this.parseMovesFromText(content);
          if (moves.length > 0) {
            variations.push(moves);
          }
          return '';
        });
      }
    }
    
    return variations;
  }

  private parseMovesFromText(text: string): string[] {
    const moves: string[] = [];
    
    // Enhanced regex pattern to capture chess moves including castling and pawn captures
    const movePattern = /\d+\.?\s*((?:O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?))\s*((?:O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?))?/g;
    
    let match;
    while ((match = movePattern.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        moves.push(match[1].trim());
      }
      if (match[2] && match[2].trim()) {
        moves.push(match[2].trim());
      }
    }
    
    return moves;
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