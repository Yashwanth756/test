import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

const MONGO_URI = 'mongodb+srv://root:root@cluster0.jt307.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const connect = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI, {
    dbName: 'school',
    bufferCommands: false,
  });
};

export const GET = async (req: Request) => {
  try {
    await connect();
    const url = new URL(req.url);
    const uid = parseInt(url.searchParams.get('uid') || '');
    console.log(uid)
    const level = url.searchParams.get('level');

    if (uid === undefined || !level) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing uid or level' }),
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    console.log
    const collection = mongoose.connection.db!.collection('dictionary');
    const data = await collection.findOne({ 'id.uid': uid, 'id.level': level });
    console.log('hello')
    if (!data) {
      return new NextResponse(
        JSON.stringify({ error: 'Not found' }),
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const word = data.id?.word || '';
    const senses = data.senses?.[0];

    const syllableParts: string[] = senses?.syllableBreakdown || [];
    const tips: string[] = senses?.pronunciationTips || [];

    const syllables = syllableParts.map((part: string, i: number) => {
      const tip = (tips[i] || '').replace(/,\s*/g, ',\n');
      return { part, tip };
    });

    return new NextResponse(
      JSON.stringify({ word, syllables }),
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Server error' }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
