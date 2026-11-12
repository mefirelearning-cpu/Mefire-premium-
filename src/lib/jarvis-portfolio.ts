import {getPilotageServices,getPortfolioOverview,getPortfolioDetails,normalizePilotageFilters,pilotageQueryString} from '@/lib/pilotage';

const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const monthNames=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
const dateToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Douala',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const money=(n:number)=>n.toLocaleString('fr-FR')+' FCFA';
function resolveMonth(text:string,normalized:string){
 const fixed=text.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
 if(fixed)return fixed[0];
 const now=dateToday(),year=Number(now.slice(0,4)),month=Number(now.slice(5,7));
 const named=monthNames.findIndex(name=>new RegExp('\\b'+name+'\\b').test(normalized));
 if(named>=0){
  const mentionedYear=normalized.match(/\b20\d{2}\b/);
  return String(mentionedYear?Number(mentionedYear[0]):year)+'-'+String(named+1).padStart(2,'0');
 }
 if(/\b(mois dernier|mois precedent)\b/.test(normalized)){
  const d=new Date(Date.UTC(year,month-2,1));
  return d.toISOString().slice(0,7);
 }
 return /\b(ce mois|du mois|mensuel|mensuelle)\b/.test(normalized)?now.slice(0,7):null;
}
export async function answerPortfolioQuestion(prompt:string):Promise<{response:string;data:Record<string,unknown>}|null>{
 const normalized=fold(prompt);
 if(!/\b(abonnement|abonnements|expiration|expirations|expire|expirent|portefeuille|plateforme|plateformes|paiement|paiements|impaye|impayes|renouvellement|renouvellements|bilan|activations|activation)\b/.test(normalized))return null;
 const services=await getPilotageServices();
 const matches=services.map(s=>({...s,folded:fold(s.name)})).filter(s=>
   (normalized===''+s.folded)||normalized.includes(s.folded)||
   s.folded.split(' ').some(word=>word.length>4&&(' '+normalized+' ').includes(' '+word+' '))
 ).sort((a,b)=>b.folded.length-a.folded.length);
 const service=matches[0]||null;
 const aboutPortfolio=!!service||/\b(abonnement|abonnements|expiration|expirations|expire|expirent|portefeuille|plateforme|plateformes|renouvellement|renouvellements)\b/.test(normalized);
 if(!aboutPortfolio)return null;
 const month=resolveMonth(prompt,normalized);
 const endMonth=Boolean(month)&&/expir|echeance|fin du mois/.test(normalized);
 const due=/\b(sous 7 jours|dans 7 jours|cette semaine|bientot|prochainement)\b/.test(normalized)&&/expir|renouvel/.test(normalized);
 const filters=normalizePilotageFilters({
  serviceId:service?.id||'',month:month||'',axis:endMonth?'end':'start',status:due?'due':'all'
 });
 const overview=await getPortfolioOverview(filters);
 const total=overview.totals;
 const title=[service?.name||'toutes les plateformes',month||'toutes périodes'].join(' · ');
 let response=`Bien, Monsieur. Voici la situation des abonnements pour ${title}.

• Dossiers enregistrés : ${total.total}
• Abonnements actuellement actifs : ${total.active}
• Expirations dans les 7 prochains jours : ${total.due}
• Déjà expirés : ${total.expired}
• En attente d'activation : ${total.pending}
• Paiements vérifiés : ${total.verified}
• Captures en attente de vérification : ${total.submitted}
• Sans paiement confirmé ni capture en attente : ${total.unpaid}
• Valeur des dossiers non soldés : ${money(total.outstandingValue)}

${month?'Le mois filtre les dates '+(endMonth?'d’expiration.':'d’activation (ou création si non activé).'):'Tous les mois sont pris en compte.'} Les montants en attente ne sont pas des bénéfices.`;
 if(!service&&overview.rows.length){
  response+='\n\nPar plateforme :\n'+overview.rows.map(s=>`• ${s.name} : ${s.active} actif(s), ${s.due} à renouveler, ${s.unpaid+s.submitted} non confirmés`).join('\n');
 }
 if(/\b(qui|quels|liste|details|detail|clients)\b/.test(normalized)){
  const detailFilters={...filters,status:due?'due' as const:/\b(impaye|impayes|non paye|non payes)\b/.test(normalized)?'unpaid' as const:'all' as const};
  const detail=await getPortfolioDetails(detailFilters,10,0);
  if(detail.rows.length){
    response+='\n\nQuelques dossiers concernés :\n'+detail.rows.map(r=>`• ${r.customerName} — ${r.serviceName}, expiration : ${r.lifetime?'à vie':r.expiresAt?new Date(r.expiresAt).toLocaleDateString('fr-FR',{timeZone:'Africa/Douala'}):'non renseignée'} ; paiement : ${r.paymentStatus==='verified'?'vérifié':r.paymentStatus==='submitted'?'capture reçue':'non vérifié'}`).join('\n');
    if(detail.matching>10)response+='\nConsultez la vue d’ensemble pour accéder aux autres dossiers.';
  }
 }
 response+='\n\nConsulter les données : /pilotage?'+pilotageQueryString(filters);
 return{response,data:{kind:'portfolio_report',serviceId:service?.id||null,month,totals:total}};
}
