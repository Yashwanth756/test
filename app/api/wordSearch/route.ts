import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

const MONGO_URI = 'mongodb+srv://root:root@cluster0.jt307.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const connect = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI, {
    dbName: 'school',
    bufferCommands: false,
  });
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const level = req.nextUrl.searchParams.get('level');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    if (level === undefined) {
      return new NextResponse(JSON.stringify({ error: 'Missing level parameter' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const collection = mongoose.connection.db!.collection('dictionary');
    console.log(offset);

    const docs = await collection
      .find({ 'id.level': level, 'id.uid': { $gt: offset } })
      .limit(10)
      .toArray();

    console.log(docs);

    const formatted = docs.map((doc) => {
      const sense = doc.senses?.[0];
      return {
        word: doc.id.word || '',
        definition: sense?.definition || '',
        difficulty: doc.id.level || '',
      };
    });

    return new NextResponse(JSON.stringify(formatted), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error fetching vocabulary metadata:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
