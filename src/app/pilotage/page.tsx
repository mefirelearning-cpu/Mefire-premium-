import Link from 'next/link';
import {getPortfolioOverview,getPortfolioDetails,getPilotageServices,getMonthlyTimeline,normalizePilotageFilters,pilotageQueryString,PAGE_SIZE} from '@/lib/pilotage';
import './pilotage.css';
export const dynamic='force-dynamic';
const num=(n:number)=>n.toLocaleString('fr-FR');
const fcfa=(n:number)=>num(n)+' FCFA';
const date=(iso:string|null)=>iso?new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Douala',day:'2-digit',month:'short',year:'numeric'}).format(new Date(iso)):'—';
const status=(state:string,end:string|null,lifetime:boolean)=>{
 if(!lifetime&&end&&new Date(end)<=new Date())return ['Expiré','pill-red'];
 if(state==='active')return ['Actif','pill-green'];
 if(state==='pending'||state==='awaiting_payment')return ['À activer','pill-amber'];
 return [state,''];
};
const pay=(state:string)=>state==='verified'?'Vérifié':state==='submitted'?'Capture reçue':'Non vérifié';
const optionStatus=[['all','Tous les états'],['active','Actifs'],['due','Expirent dans 7 jours'],['expired','Expirés'],['pending','À activer'],['unpaid','Paiement non confirmé'],['submitted','Captures reçues'],['verified','Paiements vérifiés']] as const;
type Query=Record<string,string|undefined>;

export default async function PilotagePage({searchParams}:{searchParams:Promise<Query>}){
 const f=normalizePilotageFilters(await searchParams);
 const [overview,details,services,timeline]=await Promise.all([
  getPortfolioOverview(f),getPortfolioDetails(f),getPilotageServices(),getMonthlyTimeline()
 ]);
 const {totals,rows:byService}=overview;
 const qs=(extra:Record<string,string>)=>'/pilotage?'+pilotageQueryString(f,extra);
 const pageCount=Math.ceil(details.matching/PAGE_SIZE);
 const monthLabel=f.month?new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric',timeZone:'Africa/Douala'}).format(new Date(f.month+'-01T12:00:00+01:00')):'Toutes les périodes';
 return <div className="page-container pilotage">
  <div className="page-header"><div>
   <div className="eyebrow">PORTEFEUILLE CLIENTS</div><h1>Vue d’ensemble</h1>
   <p>Abonnements par plateforme, mois, activation, expiration et paiements.</p>
  </div><Link href="/clients/nouveau" className="primary-link">＋ Ajouter un client</Link></div>
  <section className="surface pilotage-filters">
   <h2>Choisir la période et la plateforme</h2>
   <form method="GET" action="/pilotage" className="pilotage-filter-grid">
    <label>Plateforme
     <select name="serviceId" defaultValue={f.serviceId||''}>
      <option value="">Toutes les plateformes</option>
      {services.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
     </select>
    </label>
    <label>Mois (facultatif)
     <input name="month" type="month" defaultValue={f.month||''}/>
    </label>
    <label>Regrouper le mois selon
     <select name="axis" defaultValue={f.axis}>
      <option value="start">Date d’activation / création</option>
      <option value="end">Date d’expiration</option>
     </select>
    </label>
    <label>État
     <select name="status" defaultValue={f.status}>
      {optionStatus.map(([value,label])=><option key={value} value={value}>{label}</option>)}
     </select>
    </label>
    <label className="filter-search">Rechercher
     <input name="q" defaultValue={f.q} placeholder="Client, numéro, formule…" maxLength={100}/>
    </label>
    <div className="filter-actions"><button type="submit">Appliquer</button><Link href="/pilotage">Effacer</Link></div>
   </form>
   <p className="pilotage-help">Période : <strong>{monthLabel}</strong> · Les chiffres de synthèse portent sur la plateforme et le mois choisis ; les filtres « État » et « Rechercher » affinent la liste en dessous.</p>
  </section>

  <section className="pilotage-indicators" aria-label="Indicateurs du portefeuille">
   {[
    ['Abonnements',totals.total,'Tous les dossiers'],
    ['Actifs',totals.active,'Services en cours'],
    ['À renouveler',totals.due,'Expiration sous 7 jours'],
    ['Expirés',totals.expired,'Dates dépassées'],
    ['Paiements non vérifiés',totals.unpaid+totals.submitted,'Avec ou sans capture'],
    ['À recevoir',fcfa(totals.outstandingValue),'Valeur des dossiers non réglés']
   ].map(([label,value,desc])=><div className="stat-small" key={String(label)}><span>{label}</span><strong>{value}</strong><small>{desc}</small></div>)}
  </section>

  <section className="surface pilotage-section">
   <div className="pilotage-section-head"><div><h2>Répartition par plateforme</h2><p>Toucher une plateforme pour consulter ses clients.</p></div><Link href={qs({serviceId:''})}>Toutes →</Link></div>
   {byService.length===0?<p className="empty-state">Aucun abonnement enregistré pour cette période.</p>:<div className="pilotage-services">
    {byService.map(s=><Link key={s.id} className={'pilotage-service '+(f.serviceId===s.id?'is-picked':'')} href={qs({serviceId:s.id,page:'',status:'all',q:''})}>
     <div className="service-name"><strong>{s.name}</strong><span>{num(s.total)} dossier{s.total>1?'s':''}</span></div>
     <div className="service-stats"><span><b>{s.active}</b> actifs</span><span><b>{s.due}</b> bientôt finis</span><span><b>{s.expired}</b> expirés</span><span><b>{s.unpaid+s.submitted}</b> non payés</span></div>
    </Link>)}
   </div>}
  </section>

  <section className="surface pilotage-section">
   <div className="pilotage-section-head"><div><h2>Détail des abonnements</h2><p>{num(details.matching)} dossier{details.matching>1?'s':''} correspondant aux filtres.</p></div>
    <a className="pilotage-export" href={'/api/pilotage/export?'+pilotageQueryString(f)}>Exporter CSV ↗</a>
   </div>
   {details.rows.length===0?<div className="empty-state">Aucun dossier trouvé. Modifie les filtres ou <Link href="/clients/nouveau">ajoute un client</Link>.</div>:<>
    <div className="pilotage-table-wrap"><table className="pilotage-table">
     <thead><tr><th>Client</th><th>Plateforme</th><th>Début</th><th>Expiration</th><th>Montant</th><th>Paiement</th><th>État</th></tr></thead>
     <tbody>{details.rows.map(r=>{const [label,cls]=status(r.status,r.expiresAt,r.lifetime);return <tr key={r.id}>
      <td><Link className="pilotage-customer" href={'/clients/'+r.customerId}>{r.customerName}</Link><small>{r.phone}</small></td>
      <td><strong>{r.serviceName}</strong><small>{r.planName}</small></td>
      <td>{date(r.startedAt)}</td><td>{r.lifetime?'À vie':date(r.expiresAt)}</td>
      <td className="pilotage-number">{fcfa(r.price)}</td><td>{pay(r.paymentStatus)}</td>
      <td><span className={'pill '+cls}>{label}</span></td>
     </tr>})}</tbody>
    </table></div>
    {pageCount>1&&<nav className="pilotage-pagination" aria-label="Pages des abonnements">
     {f.page>1?<Link href={qs({page:String(f.page-1)})}>← Précédente</Link>:<span/>}
     <span>Page {f.page} sur {pageCount}</span>
     {details.hasNext?<Link href={qs({page:String(f.page+1)})}>Suivante →</Link>:<span/>}
    </nav>}
   </>}
  </section>

  <section className="surface pilotage-section">
   <div className="pilotage-section-head"><div><h2>Historique mensuel</h2><p>Les ventes, activations et encaissements sont suivis séparément.</p></div></div>
   <div className="pilotage-table-wrap"><table className="pilotage-table timeline-table">
    <thead><tr><th>Mois</th><th>Commandes</th><th>Activations</th><th>Paiements vérifiés</th><th>Encaissements vérifiés</th></tr></thead>
    <tbody>{timeline.map(r=><tr key={r.month}><td><Link className="pilotage-customer" href={qs({month:r.month,axis:'start',page:'',status:'all',q:''})}>{r.month}</Link></td><td>{num(r.orders)}</td><td>{num(r.activations)}</td><td>{num(r.payments)}</td><td>{fcfa(r.amount)}</td></tr>)}</tbody>
   </table></div>
   <p className="pilotage-help">Les encaissements mensuels sont regroupés par date de vérification du paiement ; ils ne correspondent pas nécessairement aux activations du même mois. « À recevoir » n’est pas un bénéfice net.</p>
  </section>
 </div>;
}
