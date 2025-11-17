import { NextRequest, NextResponse } from 'next/server';
import { aiAssistantAgent } from '@/ai/flows/ai-assistant-agent';
import { getFirestore } from 'firebase-admin/firestore';
import { isAdmin } from '@/lib/admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, userId } = await request.json();

    // Verify admin permission
    const auth = getAuth();
    const user = await auth.getUser(userId);
    if (!isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getFirestore();
    
    // Load conversation history
    let conversationHistory: any[] = [];
    if (conversationId) {
      const convDoc = await db.collection('ai_conversations').doc(conversationId).get();
      if (convDoc.exists) {
        conversationHistory = convDoc.data()?.messages || [];
      }
    }

    // Call AI Assistant
    const response = await aiAssistantAgent({
      message,
      conversationHistory,
      userId,
    });

    // Save to conversation history
    const newConvId = conversationId || db.collection('ai_conversations').doc().id;
    await db.collection('ai_conversations').doc(newConvId).set({
      userId,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message, timestamp: new Date() },
        { role: 'assistant', content: response, timestamp: new Date() },
      ],
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      response,
      conversationId: newConvId,
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
