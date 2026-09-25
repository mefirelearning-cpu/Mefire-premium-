import {createOrderAction} from '@/app/actions/crm';
import {listCatalog,listCustomers,listOrders} from '@/lib/admin-data';
export const dynamic='force-dynamic';

export default async function Commandes(){
 const [clients,catalog,rows]=await Promise.all([listCustomers(),listCatalog(),listOrders()]);
 const plans=catalog.filter(x=>x.planId&&x.planActive&&x.serviceActive);
 const stages=[['Nouvelles',rows.filter(x=>x.status==='new').length],['Paiement à vérifier',rows.filter(x=>x.status==='payment_submitted').length],['À activer',rows.filter(x=>x.subscriptionStatus==='pending').length],['Actives',rows.filter(x=>x.status==='active').length]] as const;
 return <><div className="top"><div><h1>Commandes</h1><div className="muted">Pipeline commercial de la demande jusqu’à l’activation.</div></div></div>
 <section className="grid">{stages.map(([l,v])=><div className="card" key={l}><div className="muted">{l}</div><div className="value">{v}</div></div>)}</section>
 <section className="cols"><form className="card" action={createOrderAction}><h2>Nouvelle commande</h2><label>Client *</label><select name="customerId" required defaultValue=""><option value="" disabled>Sélectionner un client</option>{clients.map(c=><option key={c.id} value={c.id}>{[c.firstName,c.lastName].filter(Boolean).join(' ')||c.phone} — {c.phone}</option>)}</select><label>Service / formule *</label><select name="servicePlanId" required defaultValue=""><option value="" disabled>Sélectionner une formule</option>{plans.map(p=><option key={p.planId!} value={p.planId!}>{p.serviceName} — {p.planName} — {Number(p.price??0).toLocaleString('fr-FR')} {p.currency}</option>)}</select><p className="muted">Le montant est pris automatiquement dans le catalogue. Il ne peut pas être saisi manuellement.</p><button type="submit" disabled={!clients.length||!plans.length}>Créer la commande</button></form>
 <div className="card"><h2>Dernières commandes</h2>{rows.length===0?<p className="muted">Aucune commande.</p>:rows.map(o=><div className="row" key={o.id}><span><strong>{[o.firstName,o.lastName].filter(Boolean).join(' ')||o.phone}</strong><br/><span className="muted">{o.planName??'Formule'} · {o.status}</span></span><span style={{textAlign:'right'}}><strong>{Number(o.total).toLocaleString('fr-FR')} {o.currency}</strong><br/><span className="muted">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</span></span></div>)}</div></section></>;
}
