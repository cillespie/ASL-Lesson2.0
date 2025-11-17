import { ai } from '../genkit';
import { z } from 'zod';
import { generateLesson } from './admin-flows';
import { generateQuiz } from './admin-flows';
import { generateImage } from './admin-flows';
import { queryFirestoreTool } from '../tools/firestore-tool';
import { searchGitHubCodeTool, getGitHubFileTool, createPullRequestTool } from '../tools/github-tool';
// Tools will be imported as we create them

const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const AiAssistantInputSchema = z.object({
  message: z.string(),
  conversationHistory: z.array(ConversationMessageSchema).optional(),
  userId: z.string(),
});

export const aiAssistantAgent = ai.defineFlow(
  {
    name: 'aiAssistantAgent',
    inputSchema: AiAssistantInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { message, conversationHistory = [], userId } = input;

    // System prompt defining the assistant's role
    const systemPrompt = `You are an AI Assistant for an ASL (American Sign Language) learning platform. 

Your capabilities:
- Generate ASL lesson plans and quizzes
- Create educational images
- Query Firestore database for analytics and data
- Search ASL knowledge base for accurate information
- Troubleshoot code issues by analyzing GitHub repository
- Create pull requests to fix bugs (requires admin approval)

Always be helpful, concise, and educational. When making code changes, explain what you're doing and why.`;

    // Build conversation context
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    // Call LLM with tool support
    const response = await ai.generate({
      model: 'gemini-2.0-flash-exp',
      prompt: messages,
      tools: [
        queryFirestoreTool,
        searchGitHubCodeTool,
        getGitHubFileTool,
        createPullRequestTool,
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    return response.text;
  }
);
