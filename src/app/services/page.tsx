import {createServiceAction} from '@/app/actions/crm';
import {listCatalog} from '@/lib/admin-data';
export const dynamic='force-dynamic';

export default async function ServicesPage(){
 const rows=await listCatalog();
 const serviceCount=new Set(rows.map(x=>x.serviceId)).size;
 const activePlans=rows.filter(x=>x.planId&&x.planActive).length;
 return <><div className="top"><div><h1>Services & formules</h1><div className="muted">Source de vérité pour les prix, durées et disponibilités utilisés par l'IA.</div></div></div>
 <section className="grid"><div className="card"><div className="muted">Services</div><div className="value">{serviceCount}</div></div><div className="card"><div className="muted">Formules actives</div><div className="value">{activePlans}</div></div></section>
 <section className="cols"><form id="nouveau-service" className="card anchor-target" action={createServiceAction}><h2>Ajouter un service et une formule</h2><label>Nom du service *</label><input name="serviceName" required placeholder="Ex. Netflix"/><label>Description</label><textarea name="description" rows={3}/><label>Nom de la formule *</label><input name="planName" required placeholder="Ex. 1 mois"/><label>Prix (FCFA) *</label><input name="price" required inputMode="numeric" placeholder="5000"/><label>Durée en jours</label><input name="durationDays" inputMode="numeric" placeholder="30"/><label><input name="lifetime" type="checkbox" style={{width:'auto',marginRight:8}}/>Accès à vie</label><button type="submit">Enregistrer dans le catalogue</button></form>
 <div className="card"><h2>Catalogue</h2>{rows.length===0?<p className="muted">Aucun service enregistré.</p>:rows.map(r=><div className="row" key={`${r.serviceId}-${r.planId??'none'}`}><span><strong>{r.serviceName}</strong><br/><span className="muted">{r.planName??'Aucune formule'}{r.planId?` · ${r.lifetime?'À vie':`${r.durationDays??0} jours`}`:''}</span></span><strong>{r.planId?`${Number(r.price??0).toLocaleString('fr-FR')} ${r.currency}`:'—'}</strong></div>)}</div></section></>;
}
