import {createHmac,timingSafeEqual} from 'crypto';
import {NextRequest,NextResponse} from 'next/server';
import {extractIncomingWhatsApp,extractWhatsAppStatuses,persistIncomingWhatsApp,persistWhatsAppStatuses} from '@/lib/whatsapp-inbound';
import {handleIncomingWithAI} from '@/lib/ai-orchestrator';
export const runtime='nodejs';

function verifyMetaSignature(rawBody:string,signature:string|null){
 const secret=process.env.WHATSAPP_APP_SECRET;
 if(!secret||!signature?.startsWith('sha256='))return false;
 const expected=`sha256=${createHmac('sha256',secret).update(rawBody).digest('hex')}`;
 const a=Buffer.from(expected),b=Buffer.from(signature);
 return a.length===b.length&&timingSafeEqual(a,b);
}

export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 if(q.get('hub.mode')==='subscribe'&&q.get('hub.verify_token')===process.env.WHATSAPP_VERIFY_TOKEN)return new NextResponse(q.get('hub.challenge')||'',{status:200});
 return new NextResponse('Forbidden',{status:403});
}

export async function POST(req:NextRequest){
 try{
  const raw=await req.text();
  if(!verifyMetaSignature(raw,req.headers.get('x-hub-signature-256')))return NextResponse.json({received:false,error:'invalid_signature'},{status:401});
  const body=JSON.parse(raw);
  const statuses=extractWhatsAppStatuses(body);
  if(statuses.length)await persistWhatsAppStatuses(statuses);
  const incoming=extractIncomingWhatsApp(body);
  const results=[];
  for(const item of incoming){
   const saved=await persistIncomingWhatsApp(item);
   let ai=null;
   if(!saved.duplicate&&saved.customerId&&saved.conversationId)ai=await handleIncomingWithAI({customerId:saved.customerId,conversationId:saved.conversationId,text:item.text});
   results.push({saved,ai});
  }
  return NextResponse.json({received:true,messages:incoming.length,statuses:statuses.length,results});
 }catch(e){
  console.error('WhatsApp webhook error',e);
  return NextResponse.json({received:true,error:'processing_failed'});
 }
}
