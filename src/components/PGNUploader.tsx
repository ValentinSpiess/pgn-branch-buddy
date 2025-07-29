import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";

interface PGNUploaderProps {
  onPGNLoaded: (pgn: string, deckName?: string) => void;
}

export const PGNUploader = ({ onPGNLoaded }: PGNUploaderProps) => {
  const [pgnText, setPgnText] = useState('');
  const [deckName, setDeckName] = useState('');

  const samplePGN = `[Event "Ruy Lopez Training"]
[Site "Training"]
[Date "2024.01.01"]
[White "Training"]
[Black "Training"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7`;

  const handleLoadSample = () => {
    setPgnText(samplePGN);
    setDeckName("Ruy Lopez Training");
    onPGNLoaded(samplePGN, "Ruy Lopez Training");
    toast.success("Sample PGN loaded!");
  };

  const handleLoadPGN = () => {
    if (!pgnText.trim()) {
      toast.error("Please enter a PGN first");
      return;
    }
    
    const finalDeckName = deckName.trim() || "Untitled Deck";
    onPGNLoaded(pgnText, finalDeckName);
    toast.success("PGN loaded successfully!");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPgnText(content);
      const fileName = file.name.replace('.pgn', '');
      setDeckName(fileName);
      onPGNLoaded(content, fileName);
      toast.success("PGN file loaded!");
    };
    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Chess Move Trainer</h1>
        <p className="text-muted-foreground">
          Upload a PGN file or paste PGN text to start training
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Load PGN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Deck Name:
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Enter deck name (optional)"
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste PGN text:
            </label>
            <Textarea
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder="Paste your PGN here..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={handleLoadPGN} disabled={!pgnText.trim()}>
              Load PGN
            </Button>
            
            <Button variant="outline" onClick={handleLoadSample}>
              Load Sample PGN
            </Button>

            <div className="flex-1">
              <input
                type="file"
                accept=".pgn"
                onChange={handleFileUpload}
                className="hidden"
                id="pgn-upload"
              />
              <Button 
                variant="outline" 
                asChild
                className="w-full"
              >
                <label htmlFor="pgn-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PGN File
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};