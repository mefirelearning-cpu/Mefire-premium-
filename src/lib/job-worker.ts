import {and,eq,lte,sql} from 'drizzle-orm';
import {db} from '@/db';
import {scheduledJobs,subscriptions,customers,servicePlans,services} from '@/db/schema';
import {sendWhatsAppText} from './whatsapp';
function message(type:string,name:string,service:string,expiresAt:Date|null){
 if(type==='satisfaction_j2')return `Bonjour ${name}, nous espérons que votre service ${service} fonctionne correctement. Êtes-vous satisfait(e) ?`;
 const date=expiresAt?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeZone:'Africa/Douala'}).format(expiresAt):'';
 const d=type.replace('expiration_j','');
 return `Bonjour ${name}, votre abonnement ${service} expire dans ${d} jour(s), le ${date}. Répondez à ce message si vous souhaitez le renouveler.`;
}
export async function processDueJobs(limit=20){
 const now=new Date();
 const jobs=await db.select().from(scheduledJobs).where(and(eq(scheduledJobs.status,'pending'),lte(scheduledJobs.runAt,now))).limit(limit);
 let done=0,failed=0;
 for(const job of jobs){
  const [claimed]=await db.update(scheduledJobs).set({status:'processing',attempts:sql`${scheduledJobs.attempts}+1`,updatedAt:new Date()}).where(and(eq(scheduledJobs.id,job.id),eq(scheduledJobs.status,'pending'))).returning();
  if(!claimed)continue;
  try{
   if(!job.subscriptionId)throw new Error('Abonnement absent');
   const [ctx]=await db.select({phone:customers.phone,firstName:customers.firstName,expiresAt:subscriptions.expiresAt,serviceName:services.name}).from(subscriptions).innerJoin(customers,eq(subscriptions.customerId,customers.id)).innerJoin(servicePlans,eq(subscriptions.servicePlanId,servicePlans.id)).innerJoin(services,eq(servicePlans.serviceId,services.id)).where(eq(subscriptions.id,job.subscriptionId)).limit(1);
   if(!ctx)throw new Error('Contexte abonnement introuvable');
   await sendWhatsAppText({to:ctx.phone,text:message(job.jobType,ctx.firstName||'client',ctx.serviceName,ctx.expiresAt)});
   await db.update(scheduledJobs).set({status:'done',processedAt:new Date(),lastError:null,updatedAt:new Date()}).where(eq(scheduledJobs.id,job.id));done++;
  }catch(e){await db.update(scheduledJobs).set({status:'pending',lastError:e instanceof Error?e.message:'Erreur inconnue',updatedAt:new Date()}).where(eq(scheduledJobs.id,job.id));failed++;}
 }
 return{processed:jobs.length,done,failed};
}
