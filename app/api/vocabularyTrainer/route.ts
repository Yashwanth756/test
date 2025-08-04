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
    const uid = parseInt(searchParams.get('uid') || '');
    const level = searchParams.get('level');

    if (!uid || !level) {
      return NextResponse.json(
        { error: 'Missing uid or level query parameter' },
        { status: 400 }
      );
    }

    const collection = mongoose.connection.db!.collection('dictionary');

    // Fetch id.word and senses[0] using projection
    const result = await collection.findOne(
      { 'id.uid': uid, 'id.level': level },
      { projection: { 'id.word': 1, senses: 1, _id: 0 } }
    );

    if (!result || !result.senses || result.senses.length === 0) {
      return NextResponse.json(
        { message: 'No senses found for given uid and level' },
        { status: 404 }
      );
    }

    const word = result.id.word;
    const firstSense = result.senses[0];

    return NextResponse.json({ word, ...firstSense }, { status: 200 });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
