import { useState } from "react";
import { PGNUploader } from "@/components/PGNUploader";
import { VariationCard } from "@/components/VariationCard";
import { TrainingMode } from "@/components/TrainingMode";
import { PGNParser, Variation, TrainingPosition } from "@/utils/pgnParser";

type AppMode = 'upload' | 'variations' | 'training';

const Index = () => {
  const [mode, setMode] = useState<AppMode>('upload');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [deckName, setDeckName] = useState<string>('');
  const [currentTraining, setCurrentTraining] = useState<{
    variation: Variation;
    positions: TrainingPosition[];
    userColor: 'white' | 'black';
  } | null>(null);

  const pgnParser = new PGNParser();

  const handlePGNLoaded = (pgn: string, name?: string) => {
    const parsedVariations = pgnParser.parsePGN(pgn);
    setVariations(parsedVariations);
    setDeckName(name || 'Untitled Deck');
    setMode('variations');
  };

  const handleStartTraining = (variationId: string, userColor: 'white' | 'black') => {
    const variation = variations.find(v => v.id === variationId);
    if (!variation) return;

    const positions = pgnParser.createTrainingPositions(variation, userColor);
    setCurrentTraining({ variation, positions, userColor });
    setMode('training');
  };

  const handleExitTraining = () => {
    setCurrentTraining(null);
    setMode('variations');
  };

  if (mode === 'upload') {
    return <PGNUploader onPGNLoaded={handlePGNLoaded} />;
  }

  if (mode === 'training' && currentTraining) {
    return (
      <TrainingMode
        variation={currentTraining.variation}
        positions={currentTraining.positions}
        userColor={currentTraining.userColor}
        onExit={handleExitTraining}
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{deckName}</h1>
        <p className="text-muted-foreground">
          Select a variation to start training
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {variations.map((variation) => (
          <VariationCard
            key={variation.id}
            variation={variation}
            onStartTraining={handleStartTraining}
          />
        ))}
      </div>

      {variations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No variations found. Please load a valid PGN.</p>
        </div>
      )}
    </div>
  );
};

export default Index;