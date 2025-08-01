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

  private tokenizePGN(text: string): Array<{ type: 'move' | 'open' | 'close', value: string, position: number, moveNumber?: number, isBlackMove?: boolean }> {
    const tokens: Array<{ type: 'move' | 'open' | 'close', value: string, position: number, moveNumber?: number, isBlackMove?: boolean }> = [];
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
        // Parse move with move number
        const moveMatch = text.slice(i).match(/^(\d+)(\.{1,3})\s*((?:O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?))/);
        if (moveMatch) {
          const moveNumber = parseInt(moveMatch[1]);
          const dots = moveMatch[2];
          const isBlackMove = dots === '...';
          tokens.push({ 
            type: 'move', 
            value: moveMatch[3], 
            position: i,
            moveNumber,
            isBlackMove
          });
          i += moveMatch[0].length;
        } else {
          // Try to parse move without number (continuation)
          const simpleMoveMatch = text.slice(i).match(/^((?:O-O-O|O-O|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]?))/);
          if (simpleMoveMatch) {
            tokens.push({ type: 'move', value: simpleMoveMatch[1], position: i });
            i += simpleMoveMatch[0].length;
          } else {
            i++;
          }
        }
      }
    }
    
    return tokens;
  }

  private parseTokens(tokens: Array<{ type: 'move' | 'open' | 'close', value: string, position: number, moveNumber?: number, isBlackMove?: boolean }>): { mainLine: string[], variations: Array<{ startIndex: number, moves: string[], subVariations: any[] }> } {
    const mainLine: string[] = [];
    const variations: Array<{ startIndex: number, moves: string[], subVariations: any[] }> = [];
    let i = 0;
    
    while (i < tokens.length) {
      if (tokens[i].type === 'move') {
        mainLine.push(tokens[i].value);
        i++;
      } else if (tokens[i].type === 'open') {
        // Start of variation - find the correct branch point
        let branchPoint = mainLine.length; // Default to current end of main line
        
        // Look at the first move in the variation to determine the correct branch point
        if (i + 1 < tokens.length && tokens[i + 1].type === 'move') {
          const firstVariationMove = tokens[i + 1];
          if (firstVariationMove.moveNumber !== undefined) {
            // Calculate the correct branch point based on move number and color
            // For example: if variation starts with "5...e5", it branches from after white's 5th move
            let targetMoveIndex;
            if (firstVariationMove.isBlackMove) {
              // Black move - branch from after white's move of same number
              targetMoveIndex = (firstVariationMove.moveNumber - 1) * 2 + 1;
            } else {
              // White move - branch from after black's move of previous number
              targetMoveIndex = (firstVariationMove.moveNumber - 1) * 2;
            }
            
            // Ensure we don't go beyond what we've seen in the main line
            branchPoint = Math.min(targetMoveIndex, mainLine.length);
          }
        }
        
        const variationResult = this.parseVariation(tokens, i + 1);
        variations.push({
          startIndex: branchPoint,
          moves: variationResult.moves,
          subVariations: variationResult.subVariations
        });
        i = variationResult.endIndex;
      } else {
        i++;
      }
    }
    
    return { mainLine, variations };
  }

  private parseVariation(tokens: Array<{ type: 'move' | 'open' | 'close', value: string, position: number, moveNumber?: number, isBlackMove?: boolean }>, startIndex: number): { moves: string[], subVariations: any[], endIndex: number } {
    const moves: string[] = [];
    const subVariations: any[] = [];
    let i = startIndex;
    let depth = 1;
    
    while (i < tokens.length && depth > 0) {
      if (tokens[i].type === 'move') {
        moves.push(tokens[i].value);
        i++;
      } else if (tokens[i].type === 'open') {
        // Sub-variation within this variation - calculate correct branch point
        let subBranchPoint = moves.length;
        
        // Look at the first move in the sub-variation
        if (i + 1 < tokens.length && tokens[i + 1].type === 'move') {
          const firstSubMove = tokens[i + 1];
          if (firstSubMove.moveNumber !== undefined) {
            // Calculate relative branch point within this variation
            const currentStartMoveNumber = Math.floor(moves.length / 2) + 1;
            const targetRelativeIndex = (firstSubMove.moveNumber - currentStartMoveNumber) * 2;
            if (firstSubMove.isBlackMove) {
              subBranchPoint = Math.min(targetRelativeIndex + 1, moves.length);
            } else {
              subBranchPoint = Math.min(targetRelativeIndex, moves.length);
            }
          }
        }
        
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
      // Ensure branch point doesn't exceed parent moves length
      const safeBranchPoint = Math.min(variation.startIndex, parentMoves.length);
      
      // Build complete variation: parent moves up to branch point + variation moves
      const completeMoves = [
        ...parentMoves.slice(0, safeBranchPoint),
        ...variation.moves
      ];
      
      // Validate the variation by checking if all moves are legal
      if (this.validateVariation(completeMoves)) {
        const variationId = currentPath.length === 0 ? `variation-${index + 1}` : `${currentPath.join('-')}-${index + 1}`;
        const variationName = this.generateVariationName(completeMoves, safeBranchPoint, index + 1);
        
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
      }
    });
  }

  private validateVariation(moves: string[]): boolean {
    try {
      const testChess = new Chess();
      for (const move of moves) {
        const result = testChess.move(move);
        if (!result) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  private generateVariationName(moves: string[], branchPoint: number, index: number): string {
    if (moves.length === 0) return `Variation ${index}`;
    
    // Find the first different move (where variation branches off)
    const startMoveNumber = Math.floor(branchPoint / 2) + 1;
    const branchMoveIndex = branchPoint;
    
    if (branchMoveIndex < moves.length) {
      const branchMove = moves[branchMoveIndex];
      const isBlackMove = branchPoint % 2 === 1;
      const moveNumberDisplay = isBlackMove ? `${startMoveNumber}...` : `${startMoveNumber}.`;
      
      // Show the first few moves starting from the branch point
      const branchMoves = moves.slice(branchMoveIndex, Math.min(branchMoveIndex + 4, moves.length));
      const formattedBranchMoves = this.formatMovesFromIndex(branchMoves, startMoveNumber, isBlackMove);
      
      return `${index}. ${moveNumberDisplay} ${formattedBranchMoves}${moves.length > branchMoveIndex + 4 ? '...' : ''}`;
    }
    
    return `Variation ${index}`;
  }

  private formatMovesFromIndex(moves: string[], startMoveNumber: number, startsWithBlack: boolean): string {
    const formatted: string[] = [];
    let currentMoveNumber = startMoveNumber;
    let isBlackMove = startsWithBlack;
    
    for (let i = 0; i < moves.length; i++) {
      if (!isBlackMove) {
        // White move
        formatted.push(`${currentMoveNumber}. ${moves[i]}`);
        isBlackMove = true;
      } else {
        // Black move
        formatted.push(moves[i]);
        isBlackMove = false;
        currentMoveNumber++;
      }
    }
    
    return formatted.join(' ');
  }

  private formatMovesWithNumbers(moves: string[]): string {
    const formatted: string[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      if (blackMove) {
        formatted.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
      } else {
        formatted.push(`${moveNumber}. ${whiteMove}`);
      }
    }
    return formatted.join(' ');
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