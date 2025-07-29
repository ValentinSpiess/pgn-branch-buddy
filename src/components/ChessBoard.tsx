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
  
  const handleSquareClick = (fromSquare: string, toSquare: string) => {
    if (!allowMoves) return;
    onMove(fromSquare, toSquare);
  };

  const renderSquare = (piece: any, file: string, rank: string) => {
    const square = file + rank;
    const isDark = (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 1;
    const pieceSymbol = piece ? pieceUnicode[piece.color + piece.type.toUpperCase()] || '' : '';
    
    return (
      <div
        key={square}
        className={`
          w-12 h-12 flex items-center justify-center text-2xl cursor-pointer
          ${isDark ? 'bg-chess-dark' : 'bg-chess-light'}
          ${allowMoves ? 'hover:bg-opacity-80' : ''}
        `}
        onClick={() => handleSquareClick(square, square)}
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