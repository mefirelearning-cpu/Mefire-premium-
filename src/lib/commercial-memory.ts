import {and,desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {auditLogs,businesses,commercialMemory,conversations,customers,messages,servicePlans,services,subscriptions} from '@/db/schema';

async function getBusinessId(){
 const [business]=await db.select({id:businesses.id}).from(businesses).limit(1);
 if(!business)throw new Error('Entreprise non initialisée');
 return business.id;
}

export async function createMemoryEntry(input:{kind:string;title?:string;content:string;customerId?:string;language?:string}){
 const businessId=await getBusinessId();
 const allowed=new Set(['style','knowledge','policy','customer_note']);
 if(!allowed.has(input.kind))throw new Error('Type de mémoire invalide');
 if(input.kind==='customer_note'&&!input.customerId)throw new Error('Un client est requis pour une note client');
 const content=input.content.trim();
 if(content.length<3)throw new Error('Contenu trop court');
 const [row]=await db.insert(commercialMemory).values({businessId,customerId:input.customerId||null,kind:input.kind,title:input.title?.trim()||null,content,language:input.language||'fr',sourceType:'manual',active:true}).returning();
 return row;
}

export async function toggleMemoryEntry(id:string,active:boolean){
 const [row]=await db.update(commercialMemory).set({active,updatedAt:new Date()}).where(eq(commercialMemory.id,id)).returning();
 if(!row)throw new Error('Mémoire introuvable');
 return row;
}



/**
 * Une solution issue d'une intervention humaine est enregistrée comme brouillon.
 * Elle ne sera jamais injectée dans le contexte de l'IA avant validation explicite.
 */
export async function proposeSupportProcedure(input:{
 conversationId:string;title:string;serviceName?:string;symptom:string;resolution:string;
}){
 const businessId=await getBusinessId();
 const title=input.title.trim(),serviceName=(input.serviceName||'').trim();
 const symptom=input.symptom.trim(),resolution=input.resolution.trim();
 if(title.length<4||title.length>160)throw new Error('Le titre doit contenir entre 4 et 160 caractères.');
 if(symptom.length<12||symptom.length>2500)throw new Error('Décris le symptôme en 12 à 2 500 caractères.');
 if(resolution.length<12||resolution.length>2500)throw new Error('Décris la solution en 12 à 2 500 caractères.');
 if(serviceName.length>100)throw new Error('Le nom du service est trop long.');
 const displayTitle=serviceName?serviceName+' — '+title:title;
 if(displayTitle.length>180)throw new Error('Raccourcis le nom du service ou le titre : 180 caractères maximum au total.');
 const fullText=[title,serviceName,symptom,resolution].join('\n');
 const secretPatterns=[
  /\b(?:mot de passe|password|mdp)\s*(?:[:=]|est)\s*\S+/i,
  /\b(?:otp|code de vérification|code de validation|code reçu par sms)\b(?:\s+(?:est|:|=))?\s*\d{4,8}\b/i,
  /\b(?:token|secret key|clé secrète|api key)\s*[:=]\s*\S+/i
 ];
 if(secretPatterns.some(pattern=>pattern.test(fullText)))throw new Error('Ne stocke aucun mot de passe, code de vérification, OTP ou secret. Décris uniquement la procédure générale.');
 if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(fullText))throw new Error('Ne stocke pas d’adresse e-mail personnelle dans une procédure générale.');
 const [conversation]=await db.select({id:conversations.id}).from(conversations)
  .innerJoin(customers,eq(conversations.customerId,customers.id))
  .where(and(eq(conversations.id,input.conversationId),eq(customers.businessId,businessId),eq(conversations.status,'open'),eq(conversations.humanTakeover,true)))
  .limit(1);
 if(!conversation)throw new Error('Prends d’abord la main sur une conversation ouverte avant de proposer une procédure.');
 const [existing]=await db.select({id:commercialMemory.id}).from(commercialMemory)
  .where(and(eq(commercialMemory.businessId,businessId),eq(commercialMemory.sourceRef,input.conversationId)))
  .limit(1);
 if(existing)throw new Error('Une proposition existe déjà pour cette conversation. Vérifie-la dans la mémoire commerciale.');
 const content=[
  serviceName?'Service concerné : '+serviceName:'Service concerné : non précisé',
  'Problème : '+title,
  'Symptômes observés : '+symptom,
  'Solution testée par un humain : '+resolution,
  'Consigne pour JARVIS : appliquer uniquement si le symptôme du client correspond à ce cas. Ne jamais demander de mot de passe, de code OTP ou de code de vérification. Si la procédure ne résout pas le problème, transférer à un humain.'
 ].join('\n');
 const [row]=await db.insert(commercialMemory).values({
  businessId,customerId:null,kind:'knowledge',title:displayTitle,
  content,language:'fr',sourceType:'support_pending',sourceRef:input.conversationId,active:false,weight:110
 }).returning();
 if(!row)throw new Error('Impossible d’enregistrer la proposition de procédure.');
 await db.insert(auditLogs).values({businessId,actorType:'admin',action:'support.procedure.proposed',entityType:'commercial_memory',entityId:row.id,metadata:{conversationId:input.conversationId,serviceName:serviceName||null}});
 return row;
}

export async function approveSupportProcedure(id:string){
 const businessId=await getBusinessId();
 const [row]=await db.update(commercialMemory).set({active:true,sourceType:'support_approved',updatedAt:new Date()})
  .where(and(eq(commercialMemory.id,id),eq(commercialMemory.businessId,businessId),eq(commercialMemory.kind,'knowledge'),eq(commercialMemory.sourceType,'support_pending'),eq(commercialMemory.active,false)))
  .returning();
 if(!row)throw new Error('Cette proposition est introuvable ou a déjà été traitée.');
 await db.insert(auditLogs).values({businessId,actorType:'admin',action:'support.procedure.approved',entityType:'commercial_memory',entityId:row.id,metadata:{sourceRef:row.sourceRef}});
 return row;
}

export async function listMemoryEntries(){
 try{
  return await db.select({id:commercialMemory.id,kind:commercialMemory.kind,title:commercialMemory.title,content:commercialMemory.content,language:commercialMemory.language,active:commercialMemory.active,sourceType:commercialMemory.sourceType,customerId:commercialMemory.customerId,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,createdAt:commercialMemory.createdAt})
   .from(commercialMemory).leftJoin(customers,eq(commercialMemory.customerId,customers.id)).orderBy(desc(commercialMemory.createdAt)).limit(200);
 }catch(error){
  console.error('Commercial memory unavailable',error);
  return [];
 }
}

const words=(text:string)=>Array.from(new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{3,}/g)||[]));
function score(content:string,query:string){
 const q=words(query),c=new Set(words(content));
 return q.reduce((total,w)=>total+(c.has(w)?1:0),0);
}

async function relevantMemory(customerId:string,query:string){
 try{
  const businessId=await getBusinessId();
  const rows=await db.select().from(commercialMemory).where(and(eq(commercialMemory.businessId,businessId),eq(commercialMemory.active,true))).orderBy(desc(commercialMemory.weight),desc(commercialMemory.createdAt)).limit(250);
  const visible=rows.filter(x=>!x.customerId||x.customerId===customerId);
  const styles=visible.filter(x=>x.kind==='style').slice(0,8);
  const notes=visible.filter(x=>x.kind==='customer_note'&&x.customerId===customerId).slice(0,8);
  const knowledge=visible.filter(x=>x.kind==='knowledge'||x.kind==='policy').map(x=>({row:x,score:score(`${x.title||''} ${x.content}`,query)})).sort((a,b)=>b.score-a.score||b.row.weight-a.row.weight).filter(x=>x.score>0).slice(0,8).map(x=>x.row);
  return {styles,notes,knowledge};
 }catch(error){
  console.error('Commercial memory retrieval skipped',error);
  return {styles:[],notes:[],knowledge:[]};
 }
}

async function customerSubscriptions(customerId:string){
 return db.select({status:subscriptions.status,startedAt:subscriptions.startedAt,expiresAt:subscriptions.expiresAt,lifetime:subscriptions.lifetime,service:services.name,plan:servicePlans.name})
  .from(subscriptions).innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(eq(subscriptions.customerId,customerId)).orderBy(desc(subscriptions.createdAt)).limit(20);
}

async function recentConversation(conversationId:string){
 const rows=await db.select({direction:messages.direction,senderType:messages.senderType,content:messages.content,createdAt:messages.createdAt}).from(messages).where(eq(messages.conversationId,conversationId)).orderBy(desc(messages.createdAt)).limit(12);
 return rows.reverse();
}

async function relevantPastConversation(customerId:string,currentConversationId:string,query:string){
 const rows=await db.select({conversationId:conversations.id,channel:conversations.channel,direction:messages.direction,senderType:messages.senderType,content:messages.content,createdAt:messages.createdAt})
  .from(messages).innerJoin(conversations,eq(messages.conversationId,conversations.id)).where(eq(conversations.customerId,customerId)).orderBy(desc(messages.createdAt)).limit(500);
 const ranked=rows.filter(x=>x.conversationId!==currentConversationId).map(x=>({row:x,score:score(x.content,query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.row.createdAt.getTime()-a.row.createdAt.getTime()).slice(0,10).map(x=>x.row);
 return ranked;
}

export async function buildCommercialMemoryContext(input:{customerId:string;conversationId:string;query:string}){
 const [profile,subs,history,past,memory]=await Promise.all([
  db.select({firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,preferredLanguage:customers.preferredLanguage,status:customers.status,totalSpent:customers.totalSpent}).from(customers).where(eq(customers.id,input.customerId)).limit(1).then(x=>x[0]||null),
  customerSubscriptions(input.customerId),
  recentConversation(input.conversationId),
  relevantPastConversation(input.customerId,input.conversationId,input.query),
  relevantMemory(input.customerId,input.query)
 ]);
 return {profile,subscriptions:subs,recentHistory:history,relevantPastMessages:past,styleExamples:memory.styles,customerNotes:memory.notes,knowledge:memory.knowledge};
}

export async function memoryStats(){
 const rows=await listMemoryEntries();
 return {total:rows.length,active:rows.filter(x=>x.active).length,style:rows.filter(x=>x.kind==='style'&&x.active).length,importedStyle:rows.filter(x=>x.kind==='style'&&x.active&&x.sourceType==='whatsapp_import').length,knowledge:rows.filter(x=>(x.kind==='knowledge'||x.kind==='policy')&&x.active).length,customerNotes:rows.filter(x=>x.kind==='customer_note'&&x.active).length,supportPending:rows.filter(x=>x.sourceType==='support_pending').length,supportApproved:rows.filter(x=>x.sourceType==='support_approved'&&x.active).length};
}
