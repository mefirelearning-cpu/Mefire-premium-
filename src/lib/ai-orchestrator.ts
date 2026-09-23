import {eq} from 'drizzle-orm';
import {db} from '@/db';
import {conversations,customers,messages,servicePlans,services} from '@/db/schema';
import {sendWhatsAppText} from './whatsapp';

type Context={conversationId:string;customerId:string;text:string};
async function catalog(){
 return db.select({service:services.name,description:services.description,plan:servicePlans.name,price:servicePlans.price,currency:servicePlans.currency,durationDays:servicePlans.durationDays,lifetime:servicePlans.lifetime}).from(servicePlans).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(eq(servicePlans.active,true));
}
function needsHuman(text:string){return /(humain|conseiller|agent|responsable|réclamation|remboursement|probl[eè]me de paiement|arnaque)/i.test(text);}
export async function handleIncomingWithAI(input:Context){
 const [conv]=await db.select().from(conversations).where(eq(conversations.id,input.conversationId)).limit(1);
 if(!conv||!conv.aiEnabled||conv.humanTakeover)return{action:'ignored'};
 if(needsHuman(input.text)){await db.update(conversations).set({humanTakeover:true,aiEnabled:false,updatedAt:new Date()}).where(eq(conversations.id,input.conversationId));return{action:'human'};}
 const [customer]=await db.select({phone:customers.phone,firstName:customers.firstName}).from(customers).where(eq(customers.id,input.customerId)).limit(1);
 if(!customer)return{action:'ignored'};
 const offers=await catalog();
 const apiKey=process.env.OPENAI_API_KEY;
 if(!apiKey)return{action:'no_ai_config'};
 const system=`Tu es l'assistant commercial de Mefire Premium. Réponds en français sauf si le client écrit en anglais. Sois bref et professionnel. Tu peux uniquement annoncer les offres, prix, durées et disponibilités présentes dans le catalogue JSON fourni. N'invente jamais un prix, une promotion, une durée ou une disponibilité. Tu ne valides jamais un paiement et tu n'actives jamais un service. En cas d'incertitude, réponds exactement HUMAN_HANDOFF. Catalogue: ${JSON.stringify(offers)}`;
 const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5-mini',messages:[{role:'system',content:system},{role:'user',content:input.text}]})});
 if(!res.ok)throw new Error(`AI API ${res.status}`);
 const data=await res.json(); const reply=String(data?.choices?.[0]?.message?.content??'').trim();
 if(!reply||reply==='HUMAN_HANDOFF'){await db.update(conversations).set({humanTakeover:true,aiEnabled:false,updatedAt:new Date()}).where(eq(conversations.id,input.conversationId));return{action:'human'};}
 const sent=await sendWhatsAppText({to:customer.phone,text:reply});
 const providerId=sent?.messages?.[0]?.id;
 await db.insert(messages).values({conversationId:input.conversationId,direction:'out',senderType:'ai',content:reply,providerMessageId:providerId,deliveryStatus:'sent',aiGenerated:true});
 return{action:'replied',reply};
}
