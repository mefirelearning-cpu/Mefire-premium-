import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 if(q.get('hub.mode')==='subscribe'&&q.get('hub.verify_token')===process.env.WHATSAPP_VERIFY_TOKEN)return new NextResponse(q.get('hub.challenge')||'',{status:200});
 return new NextResponse('Forbidden',{status:403});
}
export async function POST(req:NextRequest){
 const body=await req.json();
 // Accusé rapide pour éviter les retries Meta. La persistance des messages entrants sera branchée ici.
 return NextResponse.json({received:true,entries:Array.isArray(body?.entry)?body.entry.length:0});
}
