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
    // console.log('API called');
  try {
    await connect();
    const url = new URL(req.url);
    const uid = parseInt(url.searchParams.get('uid') || '');
    
    const level = url.searchParams.get('level');
console.log(uid, level)
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
    console.log('Connected to database');
    // console.log
    const collection = mongoose.connection.db!.collection('stories');
    const data = await collection.findOne({ 'id': uid, 'level': level });
    console.log(data)
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

    return new NextResponse(
      JSON.stringify({ story: data.story || '' }),
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
