import {desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {conversations,customers,messages} from '@/db/schema';
import {sendWhatsAppText} from './whatsapp';
export async function listConversations(){
 return db.select({id:conversations.id,status:conversations.status,aiEnabled:conversations.aiEnabled,humanTakeover:conversations.humanTakeover,lastMessageAt:conversations.lastMessageAt,customerId:customers.id,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone}).from(conversations).innerJoin(customers,eq(conversations.customerId,customers.id)).orderBy(desc(conversations.lastMessageAt)).limit(100);
}
export async function getConversation(id:string){
 const [conversation]=await db.select({id:conversations.id,aiEnabled:conversations.aiEnabled,humanTakeover:conversations.humanTakeover,customerId:customers.id,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone}).from(conversations).innerJoin(customers,eq(conversations.customerId,customers.id)).where(eq(conversations.id,id)).limit(1);
 if(!conversation)return null;
 const history=await db.select().from(messages).where(eq(messages.conversationId,id)).orderBy(messages.createdAt).limit(200);
 return{conversation,messages:history};
}
export async function setHumanTakeover(id:string,human:boolean){const [row]=await db.update(conversations).set({humanTakeover:human,aiEnabled:!human,updatedAt:new Date()}).where(eq(conversations.id,id)).returning();return row;}
export async function sendManualReply(conversationId:string,text:string){
 const data=await getConversation(conversationId);if(!data)throw new Error('Conversation introuvable');
 const sent=await sendWhatsAppText({to:data.conversation.phone,text});
 await db.insert(messages).values({conversationId,direction:'out',senderType:'admin',content:text,providerMessageId:sent?.messages?.[0]?.id,deliveryStatus:'sent',aiGenerated:false});
 await db.update(conversations).set({humanTakeover:true,aiEnabled:false,lastMessageAt:new Date(),updatedAt:new Date()}).where(eq(conversations.id,conversationId));
}
