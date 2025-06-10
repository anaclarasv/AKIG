import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TriangleAlert, Clock, AlertCircle } from "lucide-react";

// Mock data for demonstration - in real app this would come from WebSocket/API
const mockTranscriptionSegments = [
  {
    id: "1",
    speaker: "agent" as const,
    text: "Bom dia! Meu nome é Maria, como posso ajudá-lo hoje?",
    timestamp: "00:15",
    type: "normal"
  },
  {
    id: "2",
    speaker: "client" as const,
    text: "Olá, estou com um problema na minha conta...",
    timestamp: "00:22",
    type: "normal"
  },
  {
    id: "3",
    speaker: "client" as const,
    text: "Isso é um absurdo! Vocês não sabem trabalhar!",
    timestamp: "02:45",
    type: "critical",
    criticalWords: ["absurdo"]
  },
  {
    id: "4",
    speaker: "agent" as const,
    text: "[Silêncio prolongado - 8 segundos]",
    timestamp: "02:52",
    type: "silence"
  }
];

export default function AIMonitoringPanel() {
  const [currentTime, setCurrentTime] = useState(2.5); // 2.5 minutes
  const [isLive, setIsLive] = useState(true);
  const totalDuration = 5.5; // 5.5 minutes

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setCurrentTime(prev => Math.min(prev + 0.1, totalDuration));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive, totalDuration]);

  const progressPercent = (currentTime / totalDuration) * 100;

  return (
    <Card className="lg:col-span-2 akig-card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Monitoria em Andamento</CardTitle>
            <p className="text-muted-foreground text-sm">Transcrição automática com IA</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isLive ? "default" : "secondary"} className="bg-green-100 text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              {isLive ? "Ao vivo" : "Pausado"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Audio Timeline */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>{Math.floor(currentTime)}:{String(Math.floor((currentTime % 1) * 60)).padStart(2, '0')}</span>
            <span>{Math.floor(totalDuration)}:{String(Math.floor((totalDuration % 1) * 60)).padStart(2, '0')}</span>
          </div>
          <div className="relative">
            <Progress value={progressPercent} className="h-3" />
            {/* Critical moments markers */}
            <div className="timeline-marker critical" style={{left: '45%'}}></div>
            <div className="timeline-marker warning" style={{left: '52%'}}></div>
          </div>
        </div>

        {/* AI Transcription */}
        <div className="bg-muted rounded-lg p-4 h-64 overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            {mockTranscriptionSegments.map((segment) => (
              <div 
                key={segment.id} 
                className={`flex items-start space-x-3 ${
                  segment.type === 'critical' ? 'bg-red-50 p-3 rounded-lg border-l-4 border-red-500' :
                  segment.type === 'silence' ? 'bg-amber-50 p-3 rounded-lg border-l-4 border-amber-500' :
                  ''
                }`}
              >
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  segment.speaker === 'agent' ? 'bg-blue-500' : 'bg-green-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {segment.speaker === 'agent' ? 'Atendente' : 'Cliente'} - {segment.timestamp}
                  </p>
                  <p className="text-muted-foreground">
                    {segment.criticalWords ? (
                      <>
                        {segment.text.split(segment.criticalWords[0]).map((part, index) => (
                          <span key={index}>
                            {part}
                            {index < segment.text.split(segment.criticalWords[0]).length - 1 && (
                              <span className="bg-red-200 px-1 rounded">{segment.criticalWords[0]}</span>
                            )}
                          </span>
                        ))}
                      </>
                    ) : segment.text}
                  </p>
                  {segment.type === 'critical' && (
                    <p className="text-xs text-red-600 mt-1">
                      <TriangleAlert className="w-3 h-3 inline mr-1" />
                      Palavra crítica detectada
                    </p>
                  )}
                  {segment.type === 'silence' && (
                    <p className="text-xs text-amber-600 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Pausa detectada
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-red-600 font-semibold text-lg">2</p>
            <p className="text-red-700 text-sm">Palavras Críticas</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <p className="text-amber-600 font-semibold text-lg">12s</p>
            <p className="text-amber-700 text-sm">Tempo de Silêncio</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-600 font-semibold text-lg">7.2</p>
            <p className="text-blue-700 text-sm">Tom de Voz</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
