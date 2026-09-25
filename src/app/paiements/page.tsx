import {recordPaymentAction,verifyPaymentAction} from '@/app/actions/crm';
import {listOrders,listPayments} from '@/lib/admin-data';
export const dynamic='force-dynamic';

export default async function Paiements(){
 const [orders,rows]=await Promise.all([listOrders(),listPayments()]);
 const payable=orders.filter(o=>o.status==='new');
 const received=rows.filter(x=>x.status==='verified').reduce((s,x)=>s+Number(x.amount),0);
 const pending=rows.filter(x=>x.status==='submitted');
 const pendingAmount=pending.reduce((s,x)=>s+Number(x.amount),0);
 const refunded=rows.filter(x=>x.status==='refunded').reduce((s,x)=>s+Number(x.amount),0);
 const stats=[['Reçus',`${received.toLocaleString('fr-FR')} FCFA`],['À vérifier',String(pending.length)],['En attente',`${pendingAmount.toLocaleString('fr-FR')} FCFA`],['Remboursés',`${refunded.toLocaleString('fr-FR')} FCFA`]];
 return <><div className="top"><div><h1>Paiements</h1><div className="muted">Suivi des montants reçus, en attente et à vérifier.</div></div></div>
 <section className="grid">{stats.map(([l,v])=><div className="card" key={l}><div className="muted">{l}</div><div className="value">{v}</div></div>)}</section>
 <section className="cols"><form id="nouveau-paiement" className="card anchor-target" action={recordPaymentAction}><h2>Enregistrer un paiement reçu</h2><label>Commande *</label><select name="orderId" required defaultValue=""><option value="" disabled>Sélectionner une commande</option>{payable.map(o=><option key={o.id} value={o.id}>{[o.firstName,o.lastName].filter(Boolean).join(' ')||o.phone} — {o.planName??'Formule'} — {Number(o.total).toLocaleString('fr-FR')} {o.currency}</option>)}</select><label>Moyen de paiement</label><select name="method"><option value="">Sélectionner</option><option>Orange Money</option><option>MTN MoMo</option><option>Espèces</option><option>Autre</option></select><label>Référence</label><input name="reference"/><p className="muted">Le client et le montant sont repris automatiquement depuis la commande.</p><button type="submit" disabled={!payable.length}>Enregistrer à vérifier</button></form>
 <div className="card"><h2>Transactions</h2>{rows.length===0?<p className="muted">Aucun paiement.</p>:rows.map(p=><div className="row" key={p.id}><span><strong>{[p.firstName,p.lastName].filter(Boolean).join(' ')||p.phone}</strong><br/><span className="muted">{p.method||'Moyen non précisé'} · {p.status}{p.reference?` · ${p.reference}`:''}</span></span><span style={{textAlign:'right'}}><strong>{Number(p.amount).toLocaleString('fr-FR')} {p.currency}</strong>{p.status==='submitted'?<form action={verifyPaymentAction} style={{marginTop:8}}><input type="hidden" name="paymentId" value={p.id}/><button type="submit">Vérifier</button></form>:null}</span></div>)}</div></section></>;
}
