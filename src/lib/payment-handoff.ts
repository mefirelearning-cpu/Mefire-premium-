import {desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {auditLogs,conversations,customers,messages} from '@/db/schema';
import type {IncomingWhatsApp} from './whatsapp-inbound';
import {sendWhatsAppText} from './whatsapp';

const paymentClaim=/(j['’]?ai\s+(?:déjà\s+)?(?:payé|payer|effectué|envoyé)|paiement\s+(?:est\s+)?(?:fait|effectué|envoyé)|je\s+viens\s+de\s+(?:payer|payé|envoyer)|c['’]?est\s+payé|money\s+sent|i\s+(?:have\s+)?paid)/i;
const paymentContext=/(paiement|payer|payé|orange\s*money|mtn\s*(?:momo|mobile\s*money)|mobile\s*money|capture|preuve\s+de\s+paiement|transaction|num[eé]ro\s+(?:de\s+)?paiement|payment|paid)/i;

async function saveOutgoing(conversationId:string,phone:string,text:string){
 const sent=await sendWhatsAppText({to:phone,text});
 await db.insert(messages).values({conversationId,direction:'out',senderType:'automation',content:text,providerMessageId:sent?.messages?.[0]?.id,deliveryStatus:'sent',aiGenerated:false});
}

async function hasRecentPaymentContext(conversationId:string){
 const recent=await db.select({content:messages.content}).from(messages).where(eq(messages.conversationId,conversationId)).orderBy(desc(messages.createdAt)).limit(12);
 return recent.some(x=>paymentContext.test(x.content));
}

export async function handlePaymentHandoff(input:{item:IncomingWhatsApp;customerId:string;conversationId:string;messageId?:string}){
 const [customer]=await db.select({id:customers.id,businessId:customers.businessId,phone:customers.phone,firstName:customers.firstName}).from(customers).where(eq(customers.id,input.customerId)).limit(1);
 if(!customer)return{handled:false as const};

 if(input.item.type==='text'&&paymentClaim.test(input.item.text)){
  const text='Merci. Pour que nous puissions lancer la procédure d’activation, envoyez s’il vous plaît une capture d’écran du paiement ici.';
  await saveOutgoing(input.conversationId,customer.phone,text);
  return{handled:true as const,action:'request_payment_proof' as const};
 }

 if(input.item.type==='image'&&input.item.mediaId&&await hasRecentPaymentContext(input.conversationId)){
  const now=new Date();
  await db.update(conversations).set({humanTakeover:true,aiEnabled:false,lastMessageAt:now,updatedAt:now}).where(eq(conversations.id,input.conversationId));
  await db.update(customers).set({nextActionAt:now,updatedAt:now}).where(eq(customers.id,customer.id));
  await db.insert(auditLogs).values({businessId:customer.businessId,actorType:'customer',action:'payment.proof_received',entityType:'conversation',entityId:input.conversationId,metadata:{customerId:customer.id,messageId:input.messageId||null,mediaId:input.item.mediaId}});
  const text='Merci, nous avons bien reçu votre capture. Nous allons maintenant entamer la procédure d’activation. Merci de patienter quelques minutes s’il vous plaît.';
  await saveOutgoing(input.conversationId,customer.phone,text);
  return{handled:true as const,action:'payment_proof_received' as const,humanTakeover:true as const};
 }

 return{handled:false as const};
}
