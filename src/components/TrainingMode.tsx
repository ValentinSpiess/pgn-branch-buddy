import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrainingPosition, Variation } from "@/utils/pgnParser";
import { ArrowLeft, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface TrainingModeProps {
  variation: Variation;
  positions: TrainingPosition[];
  userColor: 'white' | 'black';
  onExit: () => void;
}

export const TrainingMode = ({ variation, positions, userColor, onExit }: TrainingModeProps) => {
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [chess] = useState(new Chess());
  const [gamePosition, setGamePosition] = useState('');
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [moveStatus, setMoveStatus] = useState<'correct' | 'incorrect' | null>(null);

  const currentPosition = positions[currentPositionIndex];

  useEffect(() => {
    if (currentPosition) {
      chess.load(currentPosition.fen);
      setGamePosition(currentPosition.fen);
      setWaitingForResponse(false);
      setMoveStatus(null);
    }
  }, [currentPosition, chess]);

  const handleMove = (sourceSquare: string, targetSquare: string): boolean => {
    if (waitingForResponse || !currentPosition) return false;

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      if (!move) return false;

      // Check if this is the correct move
      const expectedMove = currentPosition.moveToMake;
      const isCorrect = move.san === expectedMove || move.lan === expectedMove;

      setGamePosition(chess.fen());
      setMoveStatus(isCorrect ? 'correct' : 'incorrect');

      if (isCorrect) {
        toast.success("Correct move!");
        setWaitingForResponse(true);
        
        // Make opponent's response after a short delay
        setTimeout(() => {
          if (currentPosition.responseMove) {
            try {
              chess.move(currentPosition.responseMove);
              setGamePosition(chess.fen());
            } catch (error) {
              console.error("Error making response move:", error);
            }
          }
          
          // Move to next position after another short delay
          setTimeout(() => {
            if (currentPositionIndex < positions.length - 1) {
              setCurrentPositionIndex(prev => prev + 1);
            } else {
              toast.success("Training completed!");
              setTimeout(onExit, 1500);
            }
          }, 800);
        }, 1000);
      } else {
        toast.error(`Incorrect! Expected: ${expectedMove}`);
        
        // Reset position after showing error
        setTimeout(() => {
          chess.load(currentPosition.fen);
          setGamePosition(currentPosition.fen);
          setMoveStatus(null);
        }, 2000);
      }

      return true;
    } catch (error) {
      console.error("Invalid move:", error);
      return false;
    }
  };

  const resetPosition = () => {
    if (currentPosition) {
      chess.load(currentPosition.fen);
      setGamePosition(currentPosition.fen);
      setWaitingForResponse(false);
      setMoveStatus(null);
    }
  };

  const progressPercentage = ((currentPositionIndex + 1) / positions.length) * 100;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" onClick={onExit}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Variations
            </Button>
            <Badge variant="secondary">
              Playing as {userColor}
            </Badge>
          </div>
          
          <ChessBoard
            position={gamePosition}
            onMove={handleMove}
            orientation={userColor}
            allowMoves={!waitingForResponse}
          />
        </div>

        {/* Training Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{variation.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>{currentPositionIndex + 1}/{positions.length}</span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
              </div>

              {currentPosition && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Current Position</h4>
                    <p className="text-sm text-muted-foreground">
                      {currentPosition.description}
                    </p>
                  </div>

                  {moveStatus && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      moveStatus === 'correct' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {moveStatus === 'correct' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {moveStatus === 'correct' ? 'Correct!' : 'Try again'}
                      </span>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetPosition}
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Position
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};