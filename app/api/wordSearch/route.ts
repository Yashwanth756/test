import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

const MONGO_URI = process.env.MONGO_URI;

const connect = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI!, {
    dbName: 'school',
    bufferCommands: false,
  });
};

export const GET = async (req: Request) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const startOffset = parseInt(searchParams.get('startOffset') || '0');
    const level = searchParams.get('level');

    if (isNaN(startOffset) || !level) {
      return NextResponse.json(
        { error: 'Missing or invalid startOffset or level' },
        { status: 400 }
      );
    }

    const collection = mongoose.connection.db!.collection('dictionary');

    // Fetch 10 entries with word and first definition
    const docs = await collection
      .find(
        { 'id.level': level },
        { projection: { 'id.word': 1, 'senses.definition': 1, _id: 0 } }
      )
      .skip(startOffset)
      .limit(10)
      .toArray();

    // Map to desired structure: { word, definition }
    const words = docs.map(doc => ({
      word: doc.id.word,
      definition: doc.senses?.[0]?.definition || '',
    }));

    return NextResponse.json({ words }, { status: 200 });
  } catch (error) {
    console.error('Error fetching word definitions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
