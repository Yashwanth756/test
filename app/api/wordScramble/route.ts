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
    const offset = parseInt(searchParams.get('offset') || '');
    const level = searchParams.get('level');

    if (isNaN(offset) || !level) {
      return new NextResponse(JSON.stringify({
        error: 'Missing or invalid offset or level query parameter',
      }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const collection = mongoose.connection.db!.collection('dictionary');

    const docs = await collection.find(
      {
        'id.level': level,
        'id.uid': { $gte: offset },
      },
      {
        projection: {
          'id.word': 1,
          'id.level': 1,
          _id: 0,
        },
      }
    )
    .sort({ 'id.uid': 1 })
    .limit(10)
    .toArray();

    const result = docs.map(doc => ({
      word: doc.id.word,
      difficulty: doc.id.level,
    }));

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // 🔥 This enables CORS
      },
    });

  } catch (error) {
    console.error('Error fetching words:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
