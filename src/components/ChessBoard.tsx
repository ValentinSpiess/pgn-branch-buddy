
import { Chessboard } from "react-chessboard";

interface ChessBoardProps {
  position: string;
  onMove: (sourceSquare: string, targetSquare: string) => boolean;
  orientation?: "white" | "black";
  allowMoves?: boolean;
}

export const ChessBoard = ({ 
  position, 
  onMove, 
  orientation = "white",
  allowMoves = true 
}: ChessBoardProps) => {
  const handlePieceDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) => {
    if (!allowMoves) return false;
    return onMove(sourceSquare, targetSquare);
  };

  return (
    <div className="chess-board-container max-w-md mx-auto">
      <div 
        className="rounded-lg overflow-hidden"
        style={{ 
          background: 'var(--gradient-board)',
          padding: '12px'
        }}
      >
        <Chessboard 
          options={{
            position,
            onPieceDrop: allowMoves ? handlePieceDrop : undefined,
            boardOrientation: orientation
          }}
        />
      </div>
    </div>
  );
};
