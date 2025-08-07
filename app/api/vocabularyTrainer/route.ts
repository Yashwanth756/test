import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

const MONGO_URI = process.env.MONGO_URI ;

const connect = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI!, {
    dbName: 'school',
    bufferCommands: false,
  });
};

export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const level = req.nextUrl.searchParams.get('level');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    if (level == undefined) {
      return new NextResponse(JSON.stringify({ error: 'Missing level parameter' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const collection = mongoose.connection.db!.collection('dictionary');

    const docs = await collection
      .find({ 'id.level': level })
      .skip(offset)
      .limit(10)
      .toArray();

    const formatted = docs.map((doc) => {
      const sense = doc.senses?.[0];

      return {
        word: doc.id.word || '',
        meaning: sense?.definition || '',
        example: sense?.sentences?.[0] || '',
        partOfSpeech: sense?.pos || '',
        phonetic: sense?.syllables || '',
        synonyms: sense?.synonyms || [],
        antonyms: Array.isArray(sense?.antonyms)
          ? sense.antonyms
              .map((a: any) => (typeof a === 'string' ? a : a.word))
              .filter(Boolean)
          : [],
        memoryTip: sense?.memoryTip || '',
      };
    });

    return new NextResponse(JSON.stringify(formatted), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error fetching words:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch words' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
