import { useState } from "react";
import { Chess } from "chess.js";

interface ChessBoardProps {
  position: string;
  onMove: (sourceSquare: string, targetSquare: string) => boolean;
  orientation?: "white" | "black";
  allowMoves?: boolean;
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

const pieceUnicode: { [key: string]: string } = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

export const ChessBoard = ({ 
  position, 
  onMove, 
  orientation = "white",
  allowMoves = true 
}: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  
  // Use starting position as fallback if position is invalid
  const validPosition = position || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  
  let chess;
  try {
    chess = new Chess(validPosition);
  } catch (error) {
    // Fallback to starting position if FEN is invalid
    chess = new Chess();
  }
  
  const board = chess.board();
  
  const handleSquareClick = (square: string) => {
    if (!allowMoves) return;
    
    if (selectedSquare === null) {
      // First click - select a piece
      const piece = getPieceAtSquare(square);
      if (piece) {
        setSelectedSquare(square);
      }
    } else if (selectedSquare === square) {
      // Clicking the same square - deselect
      setSelectedSquare(null);
    } else {
      // Second click - attempt to move
      const moveSuccessful = onMove(selectedSquare, square);
      setSelectedSquare(null); // Always clear selection after move attempt
    }
  };

  const getPieceAtSquare = (square: string) => {
    const file = square[0];
    const rank = square[1];
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    return board[rankIndex][fileIndex];
  };

  const renderSquare = (piece: any, file: string, rank: string) => {
    const square = file + rank;
    const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;
    const isSelected = selectedSquare === square;
    const pieceSymbol = piece ? pieceUnicode[piece.color + piece.type.toUpperCase()] || '' : '';
    
    return (
      <div
        key={square}
        className={`
          w-12 h-12 flex items-center justify-center text-2xl cursor-pointer
          transition-colors duration-200
          ${isDark ? 'bg-chess-dark' : 'bg-chess-light'}
          ${isSelected ? 'bg-chess-selected' : ''}
          ${allowMoves ? 'hover:bg-chess-highlight' : ''}
        `}
        onClick={() => handleSquareClick(square)}
      >
        {pieceSymbol}
      </div>
    );
  };

  const renderBoard = () => {
    const displayFiles = orientation === "black" ? [...files].reverse() : files;
    const displayRanks = orientation === "black" ? [...ranks].reverse() : ranks;
    
    return displayRanks.map(rank => {
      const rankIndex = ranks.indexOf(rank);
      return (
        <div key={rank} className="flex">
          {displayFiles.map(file => {
            const fileIndex = files.indexOf(file);
            const piece = board[rankIndex][fileIndex];
            return renderSquare(piece, file, rank);
          })}
        </div>
      );
    });
  };

  return (
    <div className="chess-board-container max-w-md mx-auto">
      <div 
        className="rounded-lg overflow-hidden border-2 border-chess-border"
        style={{ 
          background: 'var(--gradient-board)',
          padding: '12px'
        }}
      >
        <div className="inline-block">
          {renderBoard()}
        </div>
      </div>
    </div>
  );
};