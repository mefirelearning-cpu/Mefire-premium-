import {saveAiBudgetAction} from '@/app/actions/costs';
import {getCostDashboard} from '@/lib/costs';
export const dynamic='force-dynamic';

function usd(value:number){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'USD',minimumFractionDigits:value<1?4:2,maximumFractionDigits:value<1?4:2}).format(value);}
function compact(value:number){return new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:1}).format(value);}

export default async function DepensesPage(){
 const data=await getCostDashboard();
 const ratio=data.budgetUsd>0?Math.min(100,(data.aiMonthUsd/data.budgetUsd)*100):0;
 const warning=ratio>=data.warningPercent;
 return <>
  <div className="top"><div><h1>Dépenses & crédits</h1><div className="muted">Suivi des coûts IA, WhatsApp et autres API depuis un seul endroit.</div></div></div>

  {!data.available&&<div className="notice" style={{marginTop:20}}><strong>Suivi prêt à être activé</strong><br/>La migration de suivi des coûts doit encore être appliquée à la base de données. Tant qu’elle ne l’est pas, les appels IA continuent de fonctionner mais les dépenses ne sont pas enregistrées.</div>}

  <section className="grid" style={{marginTop:20}}>
   <div className="card"><div className="muted">Dépenses ce mois</div><div className="value" style={{fontSize:26}}>{usd(data.monthUsd)}</div><div className="muted">Toutes catégories</div></div>
   <div className="card"><div className="muted">IA ce mois</div><div className="value" style={{fontSize:26}}>{usd(data.aiMonthUsd)}</div><div className="muted">{compact(data.inputUnits+data.outputUnits)} tokens suivis</div></div>
   <div className="card"><div className="muted">WhatsApp ce mois</div><div className="value" style={{fontSize:26}}>{usd(data.whatsappMonthUsd)}</div><div className="muted">Sera calculé dès la connexion Meta</div></div>
   <div className="card"><div className="muted">Aujourd’hui</div><div className="value" style={{fontSize:26}}>{usd(data.todayUsd)}</div><div className="muted">{data.requests} appel(s) facturable(s) ce mois</div></div>
  </section>

  <section className="card" style={{marginTop:20}}>
   <div className="row"><div><h2 style={{marginBottom:4}}>Budget IA mensuel</h2><div className="muted">Le plafond est configurable et peut bloquer les nouveaux appels lorsque tu actives la limite stricte.</div></div><strong>{usd(data.aiMonthUsd)} / {usd(data.budgetUsd)}</strong></div>
   <div style={{height:10,background:'#e8edf5',borderRadius:999,overflow:'hidden',margin:'16px 0'}}><div style={{height:'100%',width:`${ratio}%`,background:warning?'#d97706':'#2563eb'}}/></div>
   <form action={saveAiBudgetAction} className="settings-form">
    <label>Budget IA mensuel (USD)<input name="budgetUsd" type="number" min="0" step="0.01" defaultValue={data.budgetUsd}/></label>
    <label>Alerte à (%)<input name="warningPercent" type="number" min="1" max="100" defaultValue={data.warningPercent}/></label>
    <label style={{display:'flex',alignItems:'center',gap:8}}><input name="hardLimit" type="checkbox" defaultChecked={data.hardLimit} style={{width:'auto'}}/> Bloquer les appels IA quand le budget est atteint</label>
    <button type="submit">Enregistrer le budget</button>
   </form>
  </section>

  <section style={{marginTop:20}}>
   <h2>Coût par fournisseur et modèle</h2>
   {data.byProvider.length===0?<div className="card"><p className="muted">Aucune dépense enregistrée pour le moment.</p></div>:data.byProvider.map((item,index)=><div className="card row" key={`${item.provider}-${item.service}-${index}`} style={{marginBottom:10}}><span><strong>{item.provider}</strong><br/><span className="muted">{item.service||'Service non précisé'} · {item.requests} appel(s)</span></span><strong>{usd(item.costUsd)}</strong></div>)}
  </section>

  <section style={{marginTop:20}}>
   <h2>Dernières dépenses</h2>
   {data.recent.length===0?<div className="card"><p className="muted">L’historique apparaîtra automatiquement après les premiers appels API.</p></div>:data.recent.map(item=><div className="card row" key={item.id} style={{marginBottom:10}}><span><strong>{item.category.toUpperCase()} · {item.provider}</strong><br/><span className="muted">{item.service||'—'} · {item.totalUnits.toLocaleString('fr-FR')} unités · {new Date(item.createdAt).toLocaleString('fr-FR')}</span></span><strong>{usd(item.costUsd)}</strong></div>)}
  </section>
 </>;
}
