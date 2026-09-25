import {createCustomerAction} from '@/app/actions/crm';
import {listCustomers} from '@/lib/admin-data';
export const dynamic='force-dynamic';

export default async function ClientsPage(){
 const rows=await listCustomers();
 return <><div className="top"><div><h1>Clients</h1><div className="muted">Base clients centralisée et historique commercial.</div></div><strong>{rows.length} client(s)</strong></div>
 <section className="cols" style={{marginTop:24}}><form id="nouveau-client" className="card anchor-target" action={createCustomerAction}><h2>Nouveau client</h2><label>Prénom</label><input name="firstName" placeholder="Kevin"/><label>Nom</label><input name="lastName" placeholder="Nom"/><label>WhatsApp / téléphone *</label><input name="phone" required placeholder="+237 6XXXXXXXX"/><label>Email</label><input name="email" type="email"/><button type="submit">Enregistrer le client</button></form>
 <div className="card"><h2>Clients</h2>{rows.length===0?<p className="muted">Aucun client enregistré.</p>:rows.map(c=><div className="row" key={c.id}><span><strong>{[c.firstName,c.lastName].filter(Boolean).join(' ')||'Sans nom'}</strong><br/><span className="muted">{c.phone}{c.email?` · ${c.email}`:''}</span></span><span style={{textAlign:'right'}}><strong>{c.status}</strong><br/><span className="muted">{Number(c.totalSpent).toLocaleString('fr-FR')} FCFA</span></span></div>)}</div></section></>;
}
