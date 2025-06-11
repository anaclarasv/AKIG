import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Save, X, User, Headphones, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TranscriptionSegment {
  id: string;
  text: string;
  speaker: 'customer' | 'agent' | 'unknown';
  timestamp: string;
  startTime: number;
  endTime: number;
}

interface TranscriptionEditorProps {
  monitoringSessionId: number;
  transcription: any;
  onTranscriptionUpdate: (updatedTranscription: any) => void;
}

export default function TranscriptionEditor({ 
  monitoringSessionId, 
  transcription, 
  onTranscriptionUpdate 
}: TranscriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [editingSegment, setEditingSegment] = useState<TranscriptionSegment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (transcription?.segments) {
      // Convert transcription segments to editable format
      const editableSegments: TranscriptionSegment[] = transcription.segments.map((segment: any, index: number) => ({
        id: `segment-${index}`,
        text: segment.text || '',
        speaker: segment.speaker || 'unknown',
        timestamp: segment.timestamp || `${index * 10}s`,
        startTime: segment.start_time || index * 10,
        endTime: segment.end_time || (index + 1) * 10
      }));
      setSegments(editableSegments);
    }
  }, [transcription]);

  const handleEditSegment = (segment: TranscriptionSegment) => {
    setEditingSegment({ ...segment });
  };

  const handleSaveSegment = () => {
    if (!editingSegment) return;

    setSegments(prev => prev.map(seg => 
      seg.id === editingSegment.id ? editingSegment : seg
    ));
    setEditingSegment(null);
    
    toast({
      title: "Segmento atualizado",
      description: "As alterações foram salvas localmente.",
    });
  };

  const handleSaveTranscription = async () => {
    setIsSaving(true);
    try {
      // Prepare updated transcription data
      const updatedTranscription = {
        ...transcription,
        segments: segments.map(segment => ({
          text: segment.text,
          speaker: segment.speaker,
          timestamp: segment.timestamp,
          start_time: segment.startTime,
          end_time: segment.endTime
        })),
        manually_edited: true,
        last_edited: new Date().toISOString()
      };

      // Save to backend
      await apiRequest('PATCH', `/api/monitoring-sessions/${monitoringSessionId}/transcription`, {
        transcription: updatedTranscription
      });

      onTranscriptionUpdate(updatedTranscription);
      setIsEditing(false);

      toast({
        title: "Transcrição salva",
        description: "A transcrição editada foi salva com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a transcrição editada.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'agent':
        return <Headphones className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return 'Cliente';
      case 'agent':
        return 'Atendente';
      default:
        return 'Indefinido';
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'customer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'agent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!transcription || !segments.length) {
    return (
      <Card className="akig-card-shadow">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground">Nenhuma transcrição disponível para edição.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="akig-card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transcrição da Chamada</CardTitle>
            <div className="flex items-center gap-2">
              {transcription.manually_edited && (
                <Badge variant="outline" className="text-xs">
                  Editada Manualmente
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Editar Transcrição
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col items-center gap-1 min-w-0">
                  <Badge className={getSpeakerColor(segment.speaker)}>
                    <div className="flex items-center gap-1">
                      {getSpeakerIcon(segment.speaker)}
                      <span className="text-xs">{getSpeakerLabel(segment.speaker)}</span>
                    </div>
                  </Badge>
                  <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{segment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Transcrição - Sessão #{monitoringSessionId}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Instruções:</strong> Clique em qualquer segmento para editar o texto e definir se é do cliente ou atendente. 
                Isso ajudará a melhorar a precisão da análise de atendimento.
              </p>
            </div>

            <div className="space-y-3">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleEditSegment(segment)}
                >
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <Badge className={getSpeakerColor(segment.speaker)}>
                      <div className="flex items-center gap-1">
                        {getSpeakerIcon(segment.speaker)}
                        <span className="text-xs">{getSpeakerLabel(segment.speaker)}</span>
                      </div>
                    </Badge>
                    <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">{segment.text}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditingSegment(null);
                }}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button
                onClick={handleSaveTranscription}
                disabled={isSaving}
                className="akig-bg-primary hover:opacity-90"
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? "Salvando..." : "Salvar Transcrição"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Segment Dialog */}
      <Dialog open={!!editingSegment} onOpenChange={() => setEditingSegment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Segmento</DialogTitle>
          </DialogHeader>
          
          {editingSegment && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="speaker">Identificar como:</Label>
                <Select
                  value={editingSegment.speaker}
                  onValueChange={(value: 'customer' | 'agent' | 'unknown') => 
                    setEditingSegment({ ...editingSegment, speaker: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Cliente
                      </div>
                    </SelectItem>
                    <SelectItem value="agent">
                      <div className="flex items-center gap-2">
                        <Headphones className="w-4 h-4" />
                        Atendente
                      </div>
                    </SelectItem>
                    <SelectItem value="unknown">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Indefinido
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="segmentText">Texto do segmento:</Label>
                <Textarea
                  id="segmentText"
                  value={editingSegment.text}
                  onChange={(e) => setEditingSegment({ ...editingSegment, text: e.target.value })}
                  rows={4}
                  className="mt-1"
                  placeholder="Digite o texto deste segmento da conversa..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingSegment(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveSegment}
                  className="akig-bg-primary hover:opacity-90"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvar Segmento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}