import {NextRequest,NextResponse} from 'next/server';
import {extractIncomingWhatsApp,persistIncomingWhatsApp} from '@/lib/whatsapp-inbound';
import {handleIncomingWithAI} from '@/lib/ai-orchestrator';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 if(q.get('hub.mode')==='subscribe'&&q.get('hub.verify_token')===process.env.WHATSAPP_VERIFY_TOKEN)return new NextResponse(q.get('hub.challenge')||'',{status:200});
 return new NextResponse('Forbidden',{status:403});
}
export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const incoming=extractIncomingWhatsApp(body);
  const results=[];
  for(const item of incoming){
   const saved=await persistIncomingWhatsApp(item);
   let ai=null;
   if(!saved.duplicate&&saved.customerId&&saved.conversationId)ai=await handleIncomingWithAI({customerId:saved.customerId,conversationId:saved.conversationId,text:item.text});
   results.push({saved,ai});
  }
  return NextResponse.json({received:true,messages:incoming.length,results});
 }catch(e){
  console.error('WhatsApp webhook error',e);
  return NextResponse.json({received:true,error:'processing_failed'});
 }
}
