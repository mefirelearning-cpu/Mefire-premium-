import {and,desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {businesses,conversations,customers,messages} from '@/db/schema';

export type IncomingWhatsApp={providerMessageId:string;from:string;text:string;profileName?:string;type:'text'|'image';mediaId?:string;caption?:string};
export type WhatsAppStatus={providerMessageId:string;status:string};
function phoneVariants(raw:string){const d=raw.replace(/\D/g,'');return [d,`+${d}`];}
async function getBusinessId(){const [b]=await db.select({id:businesses.id}).from(businesses).limit(1);if(!b)throw new Error('Entreprise non initialisée');return b.id;}

export const whatsappImageMarker=(mediaId:string,caption?:string)=>`[[WA_IMAGE:${mediaId}]]${caption?`\n${caption}`:''}`;

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
 const content=input.type==='image'&&input.mediaId?whatsappImageMarker(input.mediaId,input.caption):input.text;
 const [message]=await db.insert(messages).values({conversationId:conversation.id,direction:'in',senderType:'customer',content,providerMessageId:input.providerMessageId,deliveryStatus:'received'}).onConflictDoNothing({target:messages.providerMessageId}).returning();
 return{duplicate:!message,customerId:customer.id,conversationId:conversation.id,messageId:message?.id};
}

export async function persistWhatsAppStatuses(items:WhatsAppStatus[]){
 for(const item of items){
  await db.update(messages).set({deliveryStatus:item.status}).where(eq(messages.providerMessageId,item.providerMessageId));
 }
}

export function extractIncomingWhatsApp(body:any):IncomingWhatsApp[]{
 const out:IncomingWhatsApp[]=[];
 for(const entry of body?.entry??[])for(const change of entry?.changes??[]){
  const value=change?.value; const name=value?.contacts?.[0]?.profile?.name;
  for(const m of value?.messages??[]){
   if(!m?.id||!m?.from)continue;
   if(m?.type==='text'&&m?.text?.body)out.push({providerMessageId:m.id,from:m.from,text:String(m.text.body),profileName:name,type:'text'});
   if(m?.type==='image'&&m?.image?.id){const caption=typeof m.image.caption==='string'?m.image.caption.trim():'';out.push({providerMessageId:m.id,from:m.from,text:caption||'[Image reçue]',profileName:name,type:'image',mediaId:String(m.image.id),caption:caption||undefined});}
  }
 }
 return out;
}

export function extractWhatsAppStatuses(body:any):WhatsAppStatus[]{
 const out:WhatsAppStatus[]=[];
 for(const entry of body?.entry??[])for(const change of entry?.changes??[]){
  for(const s of change?.value?.statuses??[]){if(s?.id&&s?.status)out.push({providerMessageId:s.id,status:String(s.status)});}
 }
 return out;
}
