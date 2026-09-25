import {activateSubscriptionAction} from '@/app/actions/crm';
import {listPendingActivations} from '@/lib/admin-data';
export const dynamic='force-dynamic';

export default async function Activations(){
 const rows=await listPendingActivations();
 return <><div className="top"><div><h1>File d’activations</h1><div className="muted">Abonnements dont le paiement a été vérifié et qui nécessitent ton intervention.</div></div><strong>{rows.length} à activer</strong></div>
 <div id="file-activations" className="card anchor-target" style={{marginTop:24}}><h2>À activer</h2>{rows.length===0?<p className="muted">Aucune activation en attente.</p>:rows.map(r=><div className="row" key={r.subscriptionId}><span><strong>{[r.firstName,r.lastName].filter(Boolean).join(' ')||r.phone}</strong><br/><span className="muted">{r.serviceName} · {r.planName} · {r.lifetime?'À vie':`${r.durationDays??0} jours`}</span></span><form action={activateSubscriptionAction}><input type="hidden" name="subscriptionId" value={r.subscriptionId}/><button type="submit">Activer</button></form></div>)}</div></>;
}
