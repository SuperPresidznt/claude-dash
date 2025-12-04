import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const messageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string(),
  context: z.any().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { conversationId, message, context } = messageSchema.parse(await request.json());

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.aICopilotConversation.findFirst({
      where: { id: conversationId, userId: user.id },
    });
  }

  const messages = conversation?.messages as any[] || [];
  messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  // TODO: Call AI API (OpenAI, Anthropic, or local model)
  // For now, return a mock response
  const aiResponse = `I understand you're asking about: "${message}". This is a placeholder response. Implement actual AI integration with OpenAI or Anthropic API.`;

  messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() });

  if (conversation) {
    conversation = await prisma.aICopilotConversation.update({
      where: { id: conversation.id },
      data: { messages, context },
    });
  } else {
    conversation = await prisma.aICopilotConversation.create({
      data: {
        userId: user.id,
        title: message.substring(0, 50),
        messages,
        context,
      },
    });
  }

  return NextResponse.json({ conversationId: conversation.id, response: aiResponse });
}
