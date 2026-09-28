import {and,desc,eq,ilike,lte,sql} from 'drizzle-orm';
import {db} from '@/db';
import {aiAdminCommands,auditLogs,automationRules,businesses,customerTags,customers,servicePlans,services,subscriptions,tagDefinitions} from '@/db/schema';
import {aiChat} from './ai-provider';

type AgentAction={type:string;args:Record<string,unknown>};
type AgentPlan={reformulation:string;actions:AgentAction[]};

async function businessId(){
 const [row]=await db.select({id:businesses.id}).from(businesses).limit(1);
 if(!row)throw new Error('Entreprise non initialisée');
 return row.id;
}

function parsePlan(raw:string):AgentPlan{
 const cleaned=raw.replace(/^```json\s*/i,'').replace(/```$/,'').trim();
 const parsed=JSON.parse(cleaned) as {reformulation?:unknown;actions?:unknown};
 if(!parsed||typeof parsed.reformulation!=='string'||!Array.isArray(parsed.actions))throw new Error('Plan IA invalide');
 const actions:AgentAction[]=parsed.actions.slice(0,20).map((item:unknown)=>{
  const x=(item&&typeof item==='object'?item:{}) as {type?:unknown;args?:unknown};
  return{type:String(x.type||'unsupported'),args:(x.args&&typeof x.args==='object'?x.args:{}) as Record<string,unknown>};
 });
 return{reformulation:parsed.reformulation.slice(0,3000),actions};
}

export async function proposeAdminCommand(prompt:string){
 const text=prompt.trim();
 if(text.length<2)throw new Error('Instruction trop courte');
 const bid=await businessId();
 const system=`Tu es le planificateur d'actions administratives de Mefire Premium CRM. L'administrateur peut s'exprimer librement en français. Tu dois reformuler exactement ce que tu as compris AVANT toute exécution et produire un plan structuré. Ne prétends jamais qu'une action a déjà été exécutée. Réponds uniquement en JSON valide: {"reformulation":"...","actions":[{"type":"...","args":{}}]}. Actions actuellement exécutables: customer_search(status?,service?,subscriptionStatus?,limit?), subscription_search(service?,status?,expiresWithinDays?,limit?), tag_customers(tag,status?,service?,subscriptionStatus?), automation_toggle(name,enabled), campaign_prepare(service?,tag?,text?), unsupported(reason). campaign_prepare prépare uniquement l'audience et le message, il n'envoie rien. N'invente pas de données ni d'identifiants. Si la demande nécessite une capacité non disponible, utilise unsupported au lieu de fabriquer une action. La reformulation doit être courte, précise et indiquer les éventuelles limites.`;
 const raw=await aiChat([{role:'system',content:system},{role:'user',content:text}],{temperature:0.1,json:true});
 const plan=parsePlan(raw);
 const [row]=await db.insert(aiAdminCommands).values({businessId:bid,prompt:text,reformulation:plan.reformulation,plan:plan.actions,status:'awaiting_confirmation',requiresConfirmation:true}).returning();
 if(!row)throw new Error('Impossible d’enregistrer la commande IA');
 await db.insert(auditLogs).values({businessId:bid,actorType:'admin_ai',action:'ai.command.proposed',entityType:'ai_admin_command',entityId:row.id,metadata:{prompt:text,reformulation:plan.reformulation}});
 return row;
}

async function matchedCustomers(args:Record<string,unknown>){
 const bid=await businessId();
 const status=typeof args.status==='string'?args.status.trim():'';
 const service=typeof args.service==='string'?args.service.trim():'';
 const subscriptionStatus=typeof args.subscriptionStatus==='string'?args.subscriptionStatus.trim():'';
 const limit=Math.min(Math.max(Number(args.limit)||200,1),500);
 if(service||subscriptionStatus){
  const conditions=[eq(customers.businessId,bid)];
  if(status)conditions.push(eq(customers.status,status));
  if(service)conditions.push(ilike(services.name,`%${service}%`));
  if(subscriptionStatus)conditions.push(eq(subscriptions.status,subscriptionStatus));
  return db.select({id:customers.id,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,status:customers.status,service:services.name,subscriptionStatus:subscriptions.status,expiresAt:subscriptions.expiresAt})
   .from(customers)
   .innerJoin(subscriptions,eq(subscriptions.customerId,customers.id))
   .innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id))
   .innerJoin(services,eq(servicePlans.serviceId,services.id))
   .where(and(...conditions)).orderBy(desc(customers.updatedAt)).limit(limit);
 }
 const conditions=[eq(customers.businessId,bid)];
 if(status)conditions.push(eq(customers.status,status));
 return db.select({id:customers.id,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,status:customers.status})
  .from(customers).where(and(...conditions)).orderBy(desc(customers.updatedAt)).limit(limit);
}

async function executeAction(action:AgentAction){
 const args=action.args||{};
 if(action.type==='customer_search'){
  const rows=await matchedCustomers(args);
  return{type:action.type,count:rows.length,rows:rows.slice(0,100)};
 }
 if(action.type==='subscription_search'){
  const bid=await businessId();
  const conditions=[eq(services.businessId,bid)];
  const service=typeof args.service==='string'?args.service.trim():'';
  const status=typeof args.status==='string'?args.status.trim():'';
  if(service)conditions.push(ilike(services.name,`%${service}%`));
  if(status)conditions.push(eq(subscriptions.status,status));
  const days=Number(args.expiresWithinDays);
  if(Number.isFinite(days)&&days>0){const until=new Date(Date.now()+Math.min(days,3650)*86400000);conditions.push(lte(subscriptions.expiresAt,until));}
  const limit=Math.min(Math.max(Number(args.limit)||200,1),500);
  const rows=await db.select({subscriptionId:subscriptions.id,customerId:customers.id,firstName:customers.firstName,phone:customers.phone,service:services.name,plan:servicePlans.name,status:subscriptions.status,startedAt:subscriptions.startedAt,expiresAt:subscriptions.expiresAt,lifetime:subscriptions.lifetime})
   .from(subscriptions).innerJoin(customers,eq(subscriptions.customerId,customers.id)).innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(and(...conditions)).orderBy(desc(subscriptions.updatedAt)).limit(limit);
  return{type:action.type,count:rows.length,rows:rows.slice(0,100)};
 }
 if(action.type==='tag_customers'){
  const tagName=String(args.tag||'').trim();
  if(!tagName)throw new Error('Nom d’étiquette manquant');
  const bid=await businessId();
  let [tag]=await db.select().from(tagDefinitions).where(and(eq(tagDefinitions.businessId,bid),sql`lower(${tagDefinitions.name})=lower(${tagName})`)).limit(1);
  if(!tag){
   const inserted=await db.insert(tagDefinitions).values({businessId:bid,name:tagName}).returning();
   tag=inserted[0];
  }
  if(!tag)throw new Error('Impossible de créer l’étiquette');
  const rows=await matchedCustomers({...args,limit:500});
  const uniqueIds=[...new Set(rows.map(r=>r.id))];
  if(uniqueIds.length)await db.insert(customerTags).values(uniqueIds.map(customerId=>({customerId,tagId:tag.id}))).onConflictDoNothing({target:[customerTags.customerId,customerTags.tagId]});
  return{type:action.type,tag:tag.name,tagged:uniqueIds.length};
 }
 if(action.type==='automation_toggle'){
  const name=String(args.name||'').trim();
  const enabled=Boolean(args.enabled);
  if(!name)throw new Error('Nom d’automatisation manquant');
  const bid=await businessId();
  const rows=await db.update(automationRules).set({enabled,updatedAt:new Date()}).where(and(eq(automationRules.businessId,bid),ilike(automationRules.name,`%${name}%`))).returning({id:automationRules.id,name:automationRules.name,enabled:automationRules.enabled});
  return{type:action.type,updated:rows.length,rows};
 }
 if(action.type==='campaign_prepare'){
  const rows=await matchedCustomers({service:args.service,status:args.status,subscriptionStatus:args.subscriptionStatus,limit:500});
  return{type:action.type,status:'prepared_only',audience:rows.length,text:typeof args.text==='string'?args.text:null,note:'Aucun message envoyé. Une campagne WhatsApp devra passer par les contrôles de consentement, fenêtre de conversation et template.'};
 }
 return{type:'unsupported',reason:String(args.reason||`Action ${action.type} non disponible`)};
}

export async function executeAdminCommand(id:string){
 const [command]=await db.select().from(aiAdminCommands).where(eq(aiAdminCommands.id,id)).limit(1);
 if(!command)throw new Error('Commande IA introuvable');
 if(command.status!=='awaiting_confirmation')throw new Error('Cette commande n’est plus en attente de confirmation');
 const now=new Date();
 await db.update(aiAdminCommands).set({status:'executing',confirmedAt:now,updatedAt:now}).where(eq(aiAdminCommands.id,id));
 try{
  const actions=(Array.isArray(command.plan)?command.plan:[]) as AgentAction[];
  const results:Array<Record<string,unknown>>=[];
  for(const action of actions)results.push(await executeAction(action));
  const result={actions:results};
  await db.update(aiAdminCommands).set({status:'executed',executedAt:new Date(),result,updatedAt:new Date()}).where(eq(aiAdminCommands.id,id));
  await db.insert(auditLogs).values({businessId:command.businessId,actorType:'admin_ai',action:'ai.command.executed',entityType:'ai_admin_command',entityId:id,metadata:result});
  return result;
 }catch(error){
  const message=error instanceof Error?error.message:'Erreur inconnue';
  await db.update(aiAdminCommands).set({status:'failed',error:message,updatedAt:new Date()}).where(eq(aiAdminCommands.id,id));
  throw error;
 }
}

export async function cancelAdminCommand(id:string){
 const [row]=await db.update(aiAdminCommands).set({status:'cancelled',updatedAt:new Date()}).where(and(eq(aiAdminCommands.id,id),eq(aiAdminCommands.status,'awaiting_confirmation'))).returning();
 if(!row)throw new Error('Commande impossible à annuler');
 return row;
}

export async function listAdminCommands(){
 try{return await db.select().from(aiAdminCommands).orderBy(desc(aiAdminCommands.createdAt)).limit(30);}catch{return [];}
}
