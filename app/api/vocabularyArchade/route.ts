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

function shuffleArray(array: string[]): string[] {
  return array.sort(() => Math.random() - 0.5);
}

export const GET = async (req: Request) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const uid = parseInt(searchParams.get('uid') || '');
    const level = searchParams.get('level');

    if (!uid || !level) {
      return NextResponse.json(
        { error: 'Missing uid or level' },
        { status: 400 }
      );
    }

    const collection = mongoose.connection.db!.collection('dictionary');

    // ✅ Fetch main word and full senses array
    const mainDoc = await collection.findOne(
      { 'id.uid': uid, 'id.level': level },
      { projection: { 'id.word': 1, senses: 1, _id: 0 } }
    );

    const firstSense = mainDoc?.senses?.[0];
    const shortDef = firstSense?.shortdefinition;

    if (!mainDoc || !mainDoc.id?.word || !shortDef) {
      return NextResponse.json(
        { error: 'Word or shortdefinition not found' },
        { status: 404 }
      );
    }

    const word = mainDoc.id.word;
    const correctDefinition = shortDef;

    // ✅ Sample 50 other docs and filter those with shortdefinition
    const randomDocs = await collection
      .aggregate([
        { $match: { 'id.level': level, 'id.uid': { $ne: uid } } },
        { $sample: { size: 50 } },
        { $project: { senses: 1 } }
      ])
      .toArray();

    const validWrongDefs = randomDocs
      .map(doc => doc.senses?.[0]?.shortdefinition)
      .filter(def => typeof def === 'string' && def !== correctDefinition);

    if (validWrongDefs.length < 3) {
      return NextResponse.json(
        { error: 'Not enough distractors found in sampled documents' },
        { status: 500 }
      );
    }

    const wrongDefinitions = shuffleArray(validWrongDefs).slice(0, 3);
    const options = shuffleArray([correctDefinition, ...wrongDefinitions]);

    return NextResponse.json(
      {
        word,
        correctDefinition,
        options
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
