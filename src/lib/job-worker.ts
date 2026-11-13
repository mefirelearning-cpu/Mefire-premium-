import {and,desc,eq,lte,sql} from 'drizzle-orm';
import {db} from '@/db';
import {automationRules,scheduledJobs,subscriptions,customers,servicePlans,services,conversations,messages} from '@/db/schema';
import {sendWhatsAppText} from './whatsapp';
import {reconcileLifecycleJobs} from './lifecycle-reconciliation';
const GLOBAL_PAUSE='__GLOBAL_PAUSE__';
function message(type:string,name:string,service:string,expiresAt:Date|null){
 if(type==='satisfaction_j2')return `Bonjour ${name}, nous espérons que votre service ${service} fonctionne correctement. Êtes-vous satisfait(e) ?`;
 const date=expiresAt?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'Africa/Douala'}).format(expiresAt):'';
 const d=type.replace('expiration_j','');
 return `Bonjour ${name}, votre abonnement ${service} expire dans ${d} jour(s), le ${date}. Répondez à ce message si vous souhaitez le renouveler.`;
}
export async function processDueJobs(limit=20){
 const [pause]=await db.select({id:automationRules.id}).from(automationRules).where(and(eq(automationRules.name,GLOBAL_PAUSE),eq(automationRules.enabled,true))).limit(1);
 if(pause)return{processed:0,done:0,failed:0,paused:true};
 // Met à jour les tâches après toute modification manuelle de date ou d'état.
 await reconcileLifecycleJobs();
 const now=new Date();
 const jobs=await db.select().from(scheduledJobs).where(and(eq(scheduledJobs.status,'pending'),lte(scheduledJobs.runAt,now))).limit(limit);
 let done=0,failed=0;
 for(const job of jobs){
  const [claimed]=await db.update(scheduledJobs).set({status:'processing',attempts:sql`${scheduledJobs.attempts}+1`,updatedAt:new Date()}).where(and(eq(scheduledJobs.id,job.id),eq(scheduledJobs.status,'pending'))).returning();
  if(!claimed)continue;
  try{
   if(!job.subscriptionId)throw new Error('Abonnement absent');
   const [ctx]=await db.select({phone:customers.phone,customerId:customers.id,firstName:customers.firstName,expiresAt:subscriptions.expiresAt,startedAt:subscriptions.startedAt,lifetime:subscriptions.lifetime,subscriptionStatus:subscriptions.status,serviceName:services.name}).from(subscriptions).innerJoin(customers,eq(subscriptions.customerId,customers.id)).innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(eq(subscriptions.id,job.subscriptionId)).limit(1);
   if(!ctx||ctx.subscriptionStatus!=='active'||!ctx.startedAt||
      (job.jobType.startsWith('expiration_')&&(ctx.lifetime||!ctx.expiresAt||ctx.expiresAt<=new Date()))||
      (job.jobType.startsWith('expiration_')&&job.runAt.getTime()!==new Date(ctx.expiresAt!.getTime()-Number(job.jobType.replace('expiration_j',''))*86400000).getTime())||
      (job.jobType==='satisfaction_j2'&&job.runAt.getTime()!==new Date(ctx.startedAt.getTime()+2*86400000).getTime())){
     await db.update(scheduledJobs).set({status:'cancelled',lastError:'Échéance obsolète ou abonnement inactif',updatedAt:new Date()}).where(eq(scheduledJobs.id,job.id));
     continue;
   }
   if(!['satisfaction_j2','expiration_j7','expiration_j3','expiration_j1'].includes(job.jobType))throw new Error('Type de tâche inconnu');
   // Un texte libre WhatsApp n'est autorisé que pendant les 24 h suivant
   // un message entrant du client. Hors fenêtre, il faut un modèle Meta approuvé.
   const [lastIncoming]=await db.select({at:messages.createdAt}).from(messages)
     .innerJoin(conversations,eq(messages.conversationId,conversations.id))
     .where(and(eq(conversations.customerId,ctx.customerId),eq(messages.direction,'in')))
     .orderBy(desc(messages.createdAt)).limit(1);
   if(!lastIncoming||Date.now()-new Date(lastIncoming.at).getTime()>23*60*60*1000){
     await db.update(scheduledJobs).set({
       status:'action_required',processedAt:new Date(),lastError:'Hors fenêtre WhatsApp : modèle approuvé nécessaire avant envoi.',
       updatedAt:new Date()
     }).where(eq(scheduledJobs.id,job.id));
     continue;
   }
   await sendWhatsAppText({to:ctx.phone,text:message(job.jobType,ctx.firstName||'client',ctx.serviceName,ctx.expiresAt)});
   await db.update(scheduledJobs).set({status:'done',processedAt:new Date(),lastError:null,updatedAt:new Date()}).where(eq(scheduledJobs.id,job.id));done++;
  }catch(e){await db.update(scheduledJobs).set({status:claimed.attempts>=3?'action_required':'pending',lastError:e instanceof Error?e.message:'Erreur inconnue',updatedAt:new Date()}).where(eq(scheduledJobs.id,job.id));failed++;}
 }
 return{processed:jobs.length,done,failed,paused:false};
}
