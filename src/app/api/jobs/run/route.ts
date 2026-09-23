import {NextRequest,NextResponse} from 'next/server';
import {processDueJobs} from '@/lib/job-worker';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{return NextResponse.json(await processDueJobs());}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Worker error'},{status:500});}
}
