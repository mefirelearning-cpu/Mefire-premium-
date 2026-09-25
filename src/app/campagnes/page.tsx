import {getCampaignSegments} from '@/lib/operations';
export const dynamic='force-dynamic';

const labels:{[key:string]:string}={all:'Tous les clients',active:'Clients actifs',expired:'Clients expirés',expiring7:'Expiration sous 7 jours',whatsapp:'Contacts WhatsApp identifiés'};

export default async function Campagnes({searchParams}:{searchParams:Promise<{segment?:string}>}){
 const counts=await getCampaignSegments();
 const {segment='all'}=await searchParams;
 const key=Object.prototype.hasOwnProperty.call(labels,segment)?segment:'all';
 const selected=counts[key as keyof typeof counts];
 return <><div className="top"><div><h1>Campagnes WhatsApp</h1><div className="muted">Prépare une audience à partir des données réelles du CRM.</div></div><strong>{selected} destinataire(s)</strong></div>
 <section className="cols" style={{marginTop:24}}><form className="card" method="get"><h2>Audience</h2><label>Segment</label><select name="segment" defaultValue={key}>{Object.entries(labels).map(([k,label])=><option key={k} value={k}>{label} — {counts[k as keyof typeof counts]}</option>)}</select><button type="submit">Prévisualiser l’audience</button><p className="muted">Le décompte est calculé directement depuis les clients et abonnements PostgreSQL.</p></form>
 <div className="card"><h2>Prévisualisation</h2><div className="value">{selected}</div><p>{labels[key]} actuellement éligible(s) à ce segment.</p><div className="notice"><strong>Envoi groupé non activé pour le moment.</strong><br/><span className="muted">Avant l’envoi réel, le CRM devra enregistrer le consentement WhatsApp et utiliser les modèles Meta requis pour les messages initiés par l’entreprise.</span></div></div></section>
 <div className="card" style={{marginTop:16}}><h2>Segments en direct</h2>{Object.entries(labels).map(([k,label])=><div className="row" key={k}><span>{label}</span><strong>{counts[k as keyof typeof counts]}</strong></div>)}</div></>;
}
