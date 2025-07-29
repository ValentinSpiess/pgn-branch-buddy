import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Variation } from "@/utils/pgnParser";
import { Play, BookOpen } from "lucide-react";

interface VariationCardProps {
  variation: Variation;
  onStartTraining: (variationId: string, userColor: 'white' | 'black') => void;
  progress?: {
    completed: number;
    total: number;
  };
}

export const VariationCard = ({ variation, onStartTraining, progress }: VariationCardProps) => {
  const progressPercentage = progress ? (progress.completed / progress.total) * 100 : 0;

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{variation.name}</CardTitle>
          {variation.mainline && (
            <Badge variant="secondary">
              <BookOpen className="w-3 h-3 mr-1" />
              Main Line
            </Badge>
          )}
        </div>
        {progress && (
          <div className="mt-2">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progress.completed}/{progress.total}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">
            {variation.moves.length} moves
          </p>
          <div className="text-sm font-mono text-foreground/80 line-clamp-3">
            {variation.moves.slice(0, 10).join(' ')}
            {variation.moves.length > 10 && '...'}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onStartTraining(variation.id, 'white')}
          >
            <Play className="w-4 h-4 mr-1" />
            Play White
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="flex-1"
            onClick={() => onStartTraining(variation.id, 'black')}
          >
            <Play className="w-4 h-4 mr-1" />
            Play Black
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};