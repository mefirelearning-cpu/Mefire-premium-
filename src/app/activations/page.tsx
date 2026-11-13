import Link from 'next/link';
import {activateSubscriptionAction} from '@/app/actions/crm';
import {listPendingActivations} from '@/lib/admin-data';
export const dynamic='force-dynamic';
export default async function Activations(){
 const rows=await listPendingActivations();
 return <div className="page-container">
  <div className="page-header"><div><div className="eyebrow">VENTES</div><h1>Activations à confirmer</h1>
   <p>Vous activez d’abord le service. Le client peut régler ensuite.</p></div>
   <Link className="outline-link" href="/priorites">Actions prioritaires →</Link></div>
  <section className="surface">
   <h2>En attente ({rows.length})</h2>
   <p className="muted">Confirmez ici une activation <strong>uniquement après avoir vérifié que l’accès fonctionne et que son attribution est autorisée par le fournisseur.</strong> Cette action n’active pas elle-même le service tiers.</p>
   {rows.length===0?<div className="empty-state">Aucune activation à confirmer.</div>:<div className="directory-list">
    {rows.map(row=><div key={row.subscriptionId} className="directory-item" style={{alignItems:'flex-start',flexWrap:'wrap'}}>
     <span className="avatar sub-avatar">{row.serviceName.slice(0,1)}</span>
     <span className="directory-main"><strong>{[row.firstName,row.lastName].filter(Boolean).join(' ')||row.phone}</strong>
      <small>{row.serviceName} · {row.planName} · {row.phone}</small>
      <span className="directory-meta">{row.lifetime?'Accès sans échéance':row.durationDays?row.durationDays+' jours':row.expiresAt?'Expiration déjà définie':'Date d’expiration à préciser'} · Paiement possible après confirmation</span>
     </span>
     <form action={activateSubscriptionAction} style={{display:'grid',gap:8,flexBasis:230,flexGrow:1,maxWidth:360}}>
      <input type="hidden" name="subscriptionId" value={row.subscriptionId}/>
      {!row.lifetime&&<label style={{fontSize:12}}>Expiration (facultative si durée définie)
       <input type="date" name="expiresAt" defaultValue={row.expiresAt?new Date(row.expiresAt).toISOString().slice(0,10):''}/>
      </label>}
      <button type="submit" style={{fontSize:13}}>✓ J’ai activé cet abonnement</button>
     </form>
    </div>)}
   </div>}
  </section>
 </div>;
}
