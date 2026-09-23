import {and,desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {businesses,conversations,customers,messages} from '@/db/schema';

export type IncomingWhatsApp={providerMessageId:string;from:string;text:string;profileName?:string};
function phoneVariants(raw:string){const d=raw.replace(/\D/g,'');return [d,`+${d}`];}
async function getBusinessId(){const [b]=await db.select({id:businesses.id}).from(businesses).limit(1);if(!b)throw new Error('Entreprise non initialisée');return b.id;}

export async function persistIncomingWhatsApp(input:IncomingWhatsApp){
 const [duplicate]=await db.select({id:messages.id}).from(messages).where(eq(messages.providerMessageId,input.providerMessageId)).limit(1);
 if(duplicate)return{duplicate:true,messageId:duplicate.id};
 const variants=phoneVariants(input.from);
 let [customer]=await db.select().from(customers).where(eq(customers.phone,variants[0])).limit(1);
 if(!customer)[customer]=await db.select().from(customers).where(eq(customers.phone,variants[1])).limit(1);
 if(!customer){const businessId=await getBusinessId();[customer]=await db.insert(customers).values({businessId,firstName:input.profileName||undefined,phone:variants[1],whatsappId:variants[0],status:'lead',lastContactAt:new Date()}).returning();}
 else await db.update(customers).set({whatsappId:variants[0],lastContactAt:new Date(),updatedAt:new Date()}).where(eq(customers.id,customer.id));
 let [conversation]=await db.select().from(conversations).where(and(eq(conversations.customerId,customer.id),eq(conversations.status,'open'))).orderBy(desc(conversations.createdAt)).limit(1);
 if(!conversation)[conversation]=await db.insert(conversations).values({customerId:customer.id,channel:'whatsapp',status:'open',lastMessageAt:new Date()}).returning();
 else await db.update(conversations).set({lastMessageAt:new Date(),updatedAt:new Date()}).where(eq(conversations.id,conversation.id));
 const [message]=await db.insert(messages).values({conversationId:conversation.id,direction:'in',senderType:'customer',content:input.text,providerMessageId:input.providerMessageId,deliveryStatus:'received'}).onConflictDoNothing({target:messages.providerMessageId}).returning();
 return{duplicate:!message,customerId:customer.id,conversationId:conversation.id,messageId:message?.id};
}

export function extractIncomingWhatsApp(body:any):IncomingWhatsApp[]{
 const out:IncomingWhatsApp[]=[];
 for(const entry of body?.entry??[])for(const change of entry?.changes??[]){
  const value=change?.value; const name=value?.contacts?.[0]?.profile?.name;
  for(const m of value?.messages??[]){if(m?.id&&m?.from&&m?.type==='text'&&m?.text?.body)out.push({providerMessageId:m.id,from:m.from,text:m.text.body,profileName:name});}
 }
 return out;
}
