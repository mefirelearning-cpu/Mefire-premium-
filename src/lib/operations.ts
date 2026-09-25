import {and,asc,desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {auditLogs,automationRules,businesses,conversations,customers,scheduledJobs,subscriptions} from '@/db/schema';

async function getBusinessId(){const [b]=await db.select({id:businesses.id}).from(businesses).limit(1);if(!b)throw new Error('Entreprise non initialisée');return b.id;}

export async function listSupportQueue(){
 return db.select({id:conversations.id,customerId:customers.id,firstName:customers.firstName,lastName:customers.lastName,phone:customers.phone,lastMessageAt:conversations.lastMessageAt,aiEnabled:conversations.aiEnabled,status:conversations.status})
  .from(conversations).innerJoin(customers,eq(conversations.customerId,customers.id))
  .where(and(eq(conversations.humanTakeover,true),eq(conversations.status,'open')))
  .orderBy(desc(conversations.lastMessageAt)).limit(100);
}

export async function resolveSupportConversation(id:string){
 const now=new Date();
 const [row]=await db.update(conversations).set({status:'closed',humanTakeover:false,aiEnabled:true,updatedAt:now}).where(eq(conversations.id,id)).returning();
 if(!row)throw new Error('Conversation introuvable');
 const bid=await getBusinessId();
 await db.insert(auditLogs).values({businessId:bid,actorType:'admin',action:'support.resolved',entityType:'conversation',entityId:id});
 return row;
}

export async function getCampaignSegments(){
 const [clientRows,subRows]=await Promise.all([
  db.select({id:customers.id,whatsappId:customers.whatsappId}).from(customers),
  db.select({customerId:subscriptions.customerId,status:subscriptions.status,expiresAt:subscriptions.expiresAt}).from(subscriptions)
 ]);
 const now=new Date(),in7=new Date(now.getTime()+7*86400000);
 const active=new Set(subRows.filter(x=>x.status==='active'&&(!x.expiresAt||x.expiresAt>now)).map(x=>x.customerId));
 const expired=new Set(subRows.filter(x=>x.expiresAt&&x.expiresAt<=now).map(x=>x.customerId));
 const expiring=new Set(subRows.filter(x=>x.status==='active'&&x.expiresAt&&x.expiresAt>now&&x.expiresAt<=in7).map(x=>x.customerId));
 const whatsapp=new Set(clientRows.filter(x=>x.whatsappId).map(x=>x.id));
 return {all:clientRows.length,active:active.size,expired:expired.size,expiring7:expiring.size,whatsapp:whatsapp.size};
}

export async function listAutomationOverview(){
 const [rules,jobs]=await Promise.all([
  db.select().from(automationRules).orderBy(asc(automationRules.priority),asc(automationRules.name)),
  db.select().from(scheduledJobs).orderBy(asc(scheduledJobs.runAt)).limit(100)
 ]);
 return {rules,jobs};
}

export async function pauseAutomations(){
 const now=new Date();
 await db.update(scheduledJobs).set({status:'paused',updatedAt:now}).where(eq(scheduledJobs.status,'pending'));
 const bid=await getBusinessId();
 await db.insert(auditLogs).values({businessId:bid,actorType:'admin',action:'automation.paused',entityType:'scheduled_jobs'});
}

export async function resumeAutomations(){
 const now=new Date();
 await db.update(scheduledJobs).set({status:'pending',updatedAt:now}).where(eq(scheduledJobs.status,'paused'));
 const bid=await getBusinessId();
 await db.insert(auditLogs).values({businessId:bid,actorType:'admin',action:'automation.resumed',entityType:'scheduled_jobs'});
}

export async function toggleAutomationRule(id:string,enabled:boolean){
 const [row]=await db.update(automationRules).set({enabled,updatedAt:new Date()}).where(eq(automationRules.id,id)).returning();
 if(!row)throw new Error('Règle introuvable');
 return row;
}
