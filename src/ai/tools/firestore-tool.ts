import { ai } from '../genkit';
import { z } from 'zod';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const FirestoreQuerySchema = z.object({
  collection: z.string().describe('Firestore collection name'),
  limit: z.number().optional().default(10).describe('Max results'),
  where: z.array(z.object({
    field: z.string(),
    operator: z.enum(['==', '!=', '<', '<=', '>', '>=', 'in', 'array-contains']),
    value: z.any(),
  })).optional(),
});

export const queryFirestoreTool = ai.defineTool(
  {
    name: 'query_firestore',
    description: 'Query Firestore database. Admin-only. Use for analytics, user data, content data.',
    inputSchema: FirestoreQuerySchema,
    outputSchema: z.object({
      results: z.array(z.any()),
      count: z.number(),
    }),
  },
  async (input) => {
    const db = getFirestore();
    let query: any = db.collection(input.collection);

    // Apply where clauses
    if (input.where) {
      for (const condition of input.where) {
        query = query.where(condition.field, condition.operator, condition.value);
      }
    }

    query = query.limit(input.limit);

    const snapshot = await query.get();
    const results = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      results,
      count: results.length,
    };
  }
);
