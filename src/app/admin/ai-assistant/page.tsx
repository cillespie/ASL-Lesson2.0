'use client';

import { AIAssistantChat } from '@/components/admin/AIAssistantChat';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AIAssistantPage() {
  return (
    <div className="container mx-auto p-6 h-screen">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
          <CardDescription>
            Chat with your AI assistant to generate content, troubleshoot issues, and more.
          </CardDescription>
        </CardHeader>
        <AIAssistantChat />
      </Card>
    </div>
  );
}
