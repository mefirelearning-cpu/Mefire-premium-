import Link from 'next/link';
import {getPriorityQueue} from '@/lib/priority-queue';
export const dynamic='force-dynamic';
const date=(s:string|null)=>s?new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Douala',dateStyle:'medium'}).format(new Date(s)):'—';
export default async function Priorites(){
 const {items,counts,limited}=await getPriorityQueue(100);
 return <div className="page-container">
  <div className="page-header"><div><div className="eyebrow">SUPERVISION JARVIS</div><h1>Actions prioritaires</h1><p>Les dossiers qui demandent votre attention, classés automatiquement.</p></div><Link className="outline-link" href="/pilotage">Vue d’ensemble →</Link></div>
  <div className="summary-grid">
   {([['À traiter',counts.total],['Captures reçues',counts.payment],['Paiements en retard',counts.overdue],['Expirés',counts.expired],['Renouvellements (7 j)',counts.expiring],['Activations en attente',counts.activation]] as const).map(([name,value])=><div key={name} className="stat-small"><span>{name}</span><strong>{value}</strong></div>)}
  </div>
  <section className="surface"><h2>File d’intervention</h2><p className="muted">Cette liste est en lecture seule. Aucune action ni aucun message n’est envoyé automatiquement depuis cette page.</p>
  {items.length===0?<p className="empty-state">Aucune priorité détectée dans les dossiers enregistrés.</p>:<div className="directory-list">
  {items.map(item=><Link href={'/clients/'+item.customerId} className="directory-item" key={item.id}>
   <span className="avatar sub-avatar">{item.serviceName.slice(0,1)}</span>
   <span className="directory-main"><strong>{item.customerName} · {item.serviceName}</strong><small>{item.description}</small><span className="directory-meta">{item.phone} · Expiration : {date(item.expiresAt)}</span></span><span className="chevron">›</span>
  </Link>)}</div>}
  {limited&&<p className="muted">Les 100 premiers dossiers sont affichés. Les compteurs concernent cette sélection.</p>}
  </section></div>;
}
