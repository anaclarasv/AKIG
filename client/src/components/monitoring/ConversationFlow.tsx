import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, MessageCircle, User, Headphones } from "lucide-react";

interface ConversationMessage {
  timestamp: string;
  speaker: 'agent' | 'client';
  message: string;
  sentiment: number;
  responseTime?: number;
}

interface ConversationFlowProps {
  messages: ConversationMessage[];
  channelType: 'chat' | 'email';
  speakerAnalysis?: {
    agent: {
      messageCount: number;
      avgResponseTime: number;
      sentimentScore: number;
      professionalismScore: number;
    };
    client: {
      messageCount: number;
      sentimentScore: number;
      satisfactionLevel: number;
    };
  };
}

export default function ConversationFlow({ messages, channelType, speakerAnalysis }: ConversationFlowProps) {
  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.7) return "text-green-600";
    if (sentiment >= 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const getSentimentBadge = (sentiment: number) => {
    if (sentiment >= 0.7) return <Badge className="bg-green-100 text-green-800 text-xs">Positivo</Badge>;
    if (sentiment >= 0.4) return <Badge className="bg-yellow-100 text-yellow-800 text-xs">Neutro</Badge>;
    return <Badge className="bg-red-100 text-red-800 text-xs">Negativo</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Speaker Analysis Summary */}
      {speakerAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Headphones className="w-4 h-4 text-blue-600" />
                Análise do Atendente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mensagens:</span>
                <span className="font-medium">{speakerAnalysis.agent.messageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tempo médio resposta:</span>
                <span className="font-medium">{speakerAnalysis.agent.avgResponseTime}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Profissionalismo:</span>
                <Badge variant="outline">{speakerAnalysis.agent.professionalismScore}/10</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sentimento:</span>
                <span className={getSentimentColor(speakerAnalysis.agent.sentimentScore)}>
                  {(speakerAnalysis.agent.sentimentScore * 100).toFixed(0)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" />
                Análise do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mensagens:</span>
                <span className="font-medium">{speakerAnalysis.client.messageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Satisfação:</span>
                <Badge variant="outline">{speakerAnalysis.client.satisfactionLevel}/10</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sentimento:</span>
                <span className={getSentimentColor(speakerAnalysis.client.sentimentScore)}>
                  {(speakerAnalysis.client.sentimentScore * 100).toFixed(0)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversation Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Fluxo da Conversa ({channelType === 'chat' ? 'Chat' : 'E-mail'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma mensagem processada ainda
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.speaker === 'agent' ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <Avatar className={`w-8 h-8 ${
                    message.speaker === 'agent' 
                      ? 'bg-blue-100 border-blue-300' 
                      : 'bg-orange-100 border-orange-300'
                  }`}>
                    <AvatarFallback className={
                      message.speaker === 'agent' 
                        ? 'text-blue-700 text-xs font-semibold' 
                        : 'text-orange-700 text-xs font-semibold'
                    }>
                      {message.speaker === 'agent' ? 'AT' : 'CL'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 max-w-[80%] ${
                    message.speaker === 'agent' ? 'text-left' : 'text-right'
                  }`}>
                    <div className={`rounded-lg p-3 ${
                      message.speaker === 'agent'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-orange-50 border border-orange-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          message.speaker === 'agent' ? 'text-blue-700' : 'text-orange-700'
                        }`}>
                          {message.speaker === 'agent' ? 'Atendente' : 'Cliente'}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {message.timestamp}
                        </span>
                        {getSentimentBadge(message.sentiment)}
                      </div>
                      
                      <p className="text-sm leading-relaxed">{message.message}</p>
                      
                      {message.responseTime && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Tempo de resposta: {message.responseTime}s
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {messages.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total de mensagens: {messages.length}</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Atendente
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Cliente
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}