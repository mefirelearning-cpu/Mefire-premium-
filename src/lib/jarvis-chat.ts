import {sql} from 'drizzle-orm';
import {db} from '@/db';
import {aiAdminCommands,businesses} from '@/db/schema';
import {aiProviderStatus} from '@/lib/ai-provider';
import {proposeAdminCommand} from '@/lib/admin-agent';
import {answerPortfolioQuestion} from '@/lib/jarvis-portfolio';
import {getPriorityQueue} from '@/lib/priority-queue';

type Summary={ordersToday:number;ordersYesterday:number;activationsToday:number;activationsYesterday:number;verifiedPaymentsToday:number;cashToday:number;pendingPayments:number;pendingActivations:number;humanInterventions:number;expiringSevenDays:number};

const isMutation=(input:string)=>/\b(envoie|envoyer|relance|relancer|contacte|contacter|ajoute|ajouter|active|activer|supprime|supprimer|change|changer|modifie|modifier|rembourse|rembourser|publie|publier|annule|annuler|désactive|desactive|transfère|transférer|déclenche|declenche)\b/i.test(input);
const isDailyQuestion=(input:string)=>!isMutation(input)&&!/\b(semaine|mensuel|mensuelle|mois|annuel|annuelle|année|annee)\b/i.test(input)&&/\b(bilan|rapport|statistiques?|ventes?|activations?|progression|baisse|business|chiffre d.affaires|dépenses|depenses|bénéfices|benefices|paiements?|impayés|impayes|aujourd.hui|ce jour|problèmes|problemes)\b/i.test(input);
const isGreeting=(input:string)=>/^(?:bonjour|bonsoir|salut|hello|yo)(?:[\s,!:;.]+jarvis)?[\s!?.]*$/i.test(input);
const count=(row:Record<string,unknown>,key:string)=>Number(row[key]??0)||0;

export async function getJarvisSummary():Promise<Summary>{
 const result=await db.execute(sql`
 SELECT
 (SELECT count(*) FROM orders WHERE (created_at AT TIME ZONE 'Africa/Douala')::date=(now() AT TIME ZONE 'Africa/Douala')::date) AS orders_today,
 (SELECT count(*) FROM orders WHERE (created_at AT TIME ZONE 'Africa/Douala')::date=(now() AT TIME ZONE 'Africa/Douala')::date-1) AS orders_yesterday,
 (SELECT count(*) FROM subscriptions WHERE status='active' AND started_at IS NOT NULL AND (started_at AT TIME ZONE 'Africa/Douala')::date=(now() AT TIME ZONE 'Africa/Douala')::date) AS activations_today,
 (SELECT count(*) FROM subscriptions WHERE status='active' AND started_at IS NOT NULL AND (started_at AT TIME ZONE 'Africa/Douala')::date=(now() AT TIME ZONE 'Africa/Douala')::date-1) AS activations_yesterday,
 (SELECT count(*) FROM payments WHERE status='verified' AND (coalesce(verified_at,paid_at,created_at) AT TIME ZONE 'Africa/Douala')::date=(now() AT TIME ZONE 'Africa/Douala')::date) AS verified_payments_today,
 (SELECT coalesce(sum(amount),0) FROM payments WHERE status='verified' AND (coalesce(verified_at,paid_at,created_at) AT TIME ZONE 'Africa/Douala')::date=(now() AT TIME ZONE 'Africa/Douala')::date) AS cash_today,
 (SELECT count(*) FROM payments WHERE status='submitted') AS pending_payments,
 (SELECT count(*) FROM subscriptions WHERE status='pending') AS pending_activations,
 (SELECT count(*) FROM conversations WHERE status='open' AND human_takeover=true) AS human_interventions,
 (SELECT count(*) FROM subscriptions WHERE status='active' AND lifetime=false AND expires_at>now() AND expires_at<=now()+interval '7 days') AS expiring_seven_days
 `);
 const r=(result.rows?.[0]??{}) as Record<string,unknown>;
 return{ordersToday:count(r,'orders_today'),ordersYesterday:count(r,'orders_yesterday'),activationsToday:count(r,'activations_today'),activationsYesterday:count(r,'activations_yesterday'),verifiedPaymentsToday:count(r,'verified_payments_today'),cashToday:count(r,'cash_today'),pendingPayments:count(r,'pending_payments'),pendingActivations:count(r,'pending_activations'),humanInterventions:count(r,'human_interventions'),expiringSevenDays:count(r,'expiring_seven_days')};
}

function formatReport(s:Summary){
 let progression:string;
 if(s.ordersYesterday===0) progression=s.ordersToday===0?'Aucune commande sur les deux journées.':'Comparaison en pourcentage impossible : aucune commande hier.';
 else{
  const variation=Math.round(((s.ordersToday-s.ordersYesterday)/s.ordersYesterday)*100);
  progression=variation>0?`Progression des commandes : +${variation} % par rapport à hier.`:variation<0?`Baisse des commandes : ${variation} % par rapport à hier.`:'Commandes stables par rapport à hier.';
 }
 const money=(n:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(n);
 const date=new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Douala',dateStyle:'long'}).format(new Date());
 return `Bien, Monsieur. Voici le rapport Mefire Premium du ${date} (heure de Douala).

• Commandes aujourd'hui : ${s.ordersToday} (hier : ${s.ordersYesterday}).
• Activations confirmées aujourd'hui : ${s.activationsToday} (hier : ${s.activationsYesterday}).
• Paiements vérifiés aujourd'hui : ${s.verifiedPaymentsToday}.
• Encaissements vérifiés aujourd'hui : ${money(s.cashToday)} FCFA.
• Preuves de paiement à vérifier : ${s.pendingPayments}.
• Activations en attente : ${s.pendingActivations}.
• Conversations nécessitant un humain : ${s.humanInterventions}.
• Abonnements expirant sous 7 jours : ${s.expiringSevenDays}.

${progression}

Attention : les dépenses d'achat des licences ne sont pas encore suivies par ce rapport. Le bénéfice net ne peut donc pas être calculé de façon fiable. Ces données proviennent uniquement des enregistrements du CRM ; une opération non enregistrée n'apparaîtra pas.`;
}

async function saveReadOnlyReply(prompt:string,response:string,data:Record<string,unknown>){
 const [business]=await db.select({id:businesses.id}).from(businesses).limit(1);
 if(!business)throw new Error('Entreprise non initialisée');
 const [row]=await db.insert(aiAdminCommands).values({
  businessId:business.id,prompt,reformulation:response,
  plan:[{type:'jarvis_read_only',args:{}}],status:'executed',
  requiresConfirmation:false,executedAt:new Date(),result:{type:'jarvis_read_only',data}
 }).returning();
 if(!row)throw new Error('Impossible d’enregistrer la réponse de JARVIS');
 return row;
}

/** Rapport de lecture seul. Toute commande modifiant le CRM passe par la validation existante. */
export async function submitJarvisRequest(input:string){
 const prompt=input.trim().slice(0,3000);
 if(prompt.length<2)throw new Error('Message trop court');
 if(isGreeting(prompt))return saveReadOnlyReply(prompt,'À votre service, Monsieur. Demandez-moi le bilan du jour ou confiez-moi une tâche à préparer.',{kind:'greeting'});
 if(!isMutation(prompt)){
  if(/\\b(priorit[eé]s?|urgent(?:es?)?|[àa] traiter|actions? prioritaires?|que dois.je faire|interventions? prioritaires?)\\b/i.test(prompt)){
   const queue=await getPriorityQueue(20);
   const response=queue.items.length
    ? 'Bien, Monsieur. Voici les dossiers prioritaires à examiner :\\n\\n'+queue.items.slice(0,10).map((item,i)=>
       (i+1)+'. '+item.customerName+' — '+item.serviceName+' : '+item.description).join('\\n')
      +'\\n\\nConsultez /priorites pour ouvrir les fiches clients. Aucun message n’a été envoyé.'
    : 'Monsieur, aucun dossier prioritaire n’a été détecté dans les données enregistrées. Consultez /priorites.';
   return saveReadOnlyReply(prompt,response,{kind:'priority_queue',counts:queue.counts,items:queue.items.slice(0,10)});
  }
  const portfolio=await answerPortfolioQuestion(prompt);
  if(portfolio)return saveReadOnlyReply(prompt,portfolio.response,portfolio.data);
 }
 if(isDailyQuestion(prompt)){
  const report=await getJarvisSummary();
  return saveReadOnlyReply(prompt,formatReport(report),{kind:'daily_report',...report});
 }
 if(!aiProviderStatus().configured)return saveReadOnlyReply(prompt,'Monsieur, pour comprendre les demandes libres, configurez OPENAI_API_KEY (ou OPENROUTER_API_KEY) dans les variables privées de votre hébergement. En attendant, je peux déjà produire le bilan quotidien à partir du CRM.',{kind:'ai_not_configured'});
 return proposeAdminCommand(prompt);
}
