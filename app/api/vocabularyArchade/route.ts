import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

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

export const GET = async (req: NextRequest) => {
  try {
    await connect();

    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get('offset') || '');
    const level = searchParams.get('level');

    if (isNaN(offset) || !level) {
      return NextResponse.json(
        { error: 'Missing or invalid offset or level' },
        { status: 400 }
      );
    }

    const collection = mongoose.connection.db!.collection('dictionary');

    // Fetch 10 main documents starting from uid = offset
    const mainDocs = await collection
      .find(
        { 'id.level': level, 'id.uid': { $gte: offset } },
        { projection: { 'id.word': 1, senses: 1, 'id.uid': 1 } }
      )
      .sort({ 'id.uid': 1 })
      .limit(10)
      .toArray();

    if (!mainDocs.length) {
      return NextResponse.json(
        { error: 'No words found for given offset/level' },
        { status: 404 }
      );
    }

    // Randomly sample 50 distractor documents
    const distractorDocs = await collection.aggregate([
      { $match: { 'id.level': level } },
      { $sample: { size: 50 } },
      { $project: { senses: 1, _id: 0 } }
    ]).toArray();

    console.log(`Fetched ${distractorDocs.length} distractor documents`);

    const allDistractors = distractorDocs
      .map(doc => doc.senses?.[0]?.shortdefinition || doc.senses?.[0]?.definition)
      .filter(def => typeof def === 'string' && def.trim().length > 0);

    const formattedResults = mainDocs.map(doc => {
      const sense = doc.senses?.[0];
      const correctDef = sense?.shortdefinition || sense?.definition;
      const word = doc.id.word;
      const pos = sense?.pos || '';
      const hint = sense?.syllables || '';
      const example = sense?.sentences?.[0] || '';

      const wrongDefinitions = shuffleArray(
        allDistractors.filter(def => def !== correctDef)
      ).slice(0, 3);

      return {
        word,
        definition: correctDef || '',
        wrongDefinitions,
        partOfSpeech: pos,
        hint,
        example,
        difficulty: level
      };
    });

    const response = NextResponse.json(formattedResults, { status: 200 });

    // ✅ Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (error) {
    console.error('Error generating quiz:', error);

    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );

    // ✅ Add CORS headers to error response too
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return errorResponse;
  }
};

// ✅ CORS Preflight Handler
export const OPTIONS = () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
