import Link from 'next/link';
import {askJarvisAction} from '@/app/actions/jarvis';
import {cancelMefireAIAction,confirmMefireAIAction} from '@/app/actions/mefire-ai';
import {listAdminCommands} from '@/lib/admin-agent';
import {aiProviderStatus} from '@/lib/ai-provider';
export const dynamic='force-dynamic';

const quick=[
 ['📊 Bilan du jour','Jarvis, donne-moi le bilan des activations et des ventes aujourd’hui.'],
 ['🚨 Problèmes','Jarvis, quels problèmes et paiements en attente avons-nous aujourd’hui ?'],
 ['📈 Évolution','Jarvis, sommes-nous en progression ou en baisse aujourd’hui ?']
] as const;

export default async function JarvisPage(){
 const [rows,provider]=await Promise.all([listAdminCommands(),Promise.resolve(aiProviderStatus())]);
 const history=[...rows].reverse();
 return <div style={{maxWidth:1000,margin:'0 auto'}}>
  <div className="top">
   <div><h1>J.A.R.V.I.S.</h1><div className="muted">Votre centre de commande intelligent · Mefire Premium</div></div>
   <span style={{border:'1px solid #9ec8f4',borderRadius:999,padding:'8px 12px',fontSize:12}}>● Système en ligne · IA {provider.configured?'configurée':'à connecter'}</span>
  </div>
  <section className="card" style={{marginTop:18,background:'#0d2239',color:'#eff8ff',borderColor:'#1f5674'}}>
   <strong style={{letterSpacing:2,color:'#7ed8ff'}}>JARVIS / CANAL ADMINISTRATEUR</strong>
   <p style={{fontSize:17,lineHeight:1.6,marginBottom:8}}>À votre service, Monsieur. Je peux consulter les chiffres réels de votre CRM, préparer des opérations et soumettre toute modification à votre validation.</p>
   <small style={{color:'#b6cbe0'}}>Les commandes sensibles ne sont jamais exécutées sans confirmation. Les rapports ne prennent en compte que les données enregistrées.</small>
  </section>
  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:18}}>
   {quick.map(([label,prompt])=><form action={askJarvisAction} key={label}><input type="hidden" name="prompt" value={prompt}/><button type="submit" style={{margin:0}}>{label}</button></form>)}
   <Link href="/mefire-ai" className="quick-action" style={{padding:'10px 15px'}}>Actions supervisées →</Link>
  </div>
  <section aria-label="Historique des conversations avec JARVIS" style={{display:'grid',gap:18,marginTop:22,marginBottom:22}}>
   {history.length===0&&<div className="card"><p>En attente de votre première instruction, Monsieur.</p><div className="muted">Exemple : « Jarvis, donne-moi le bilan d’aujourd’hui. »</div></div>}
   {history.map(item=>{
    const plan=Array.isArray(item.plan)?item.plan:[];
    const result=item.result&&typeof item.result==='object'?item.result:null;
    const readOnly=plan.length===1&&(plan[0] as {type?:string})?.type==='jarvis_read_only';
    return <article key={item.id} style={{display:'grid',gap:10}}>
     <div style={{justifySelf:'end',maxWidth:'85%',background:'#e4efff',padding:'12px 16px',borderRadius:'16px 16px 3px 16px',whiteSpace:'pre-wrap'}}><strong>Vous</strong><div>{item.prompt}</div><small style={{color:'#53647a'}}>{new Date(item.createdAt).toLocaleString('fr-FR',{timeZone:'Africa/Douala'})}</small></div>
     <div className="card" style={{maxWidth:'95%',borderLeft:'4px solid #2394d5',margin:0}}>
      <strong style={{color:'#1777af'}}>JARVIS</strong>
      <p style={{whiteSpace:'pre-wrap',lineHeight:1.7,marginBottom:10}}>{item.reformulation||'Commande enregistrée.'}</p>
      {item.status==='awaiting_confirmation'&&<div>
       <div className="notice">⚠️ Proposition uniquement. Aucune modification encore exécutée.</div>
       <div style={{margin:'12px 0'}}>{plan.map((step:any,index:number)=><div key={index} style={{margin:'6px 0'}}>{index+1}. {String(step?.type||'action proposée')}</div>)}</div>
       <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <form action={confirmMefireAIAction}><input type="hidden" name="commandId" value={item.id}/><button type="submit">Confirmer et exécuter</button></form>
        <form action={cancelMefireAIAction}><input type="hidden" name="commandId" value={item.id}/><button className="danger-button" type="submit">Annuler</button></form>
       </div>
      </div>}
      {item.status==='executed'&&!readOnly&&<div className="notice">✅ Opération terminée. Résultat :<pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(result,null,2)?.slice(0,6000)}</pre></div>}
      {item.status==='failed'&&<div className="notice">⚠️ Échec : {item.error||'Erreur non précisée'}</div>}
      {item.status==='cancelled'&&<div className="muted">Commande annulée.</div>}
     </div>
    </article>;
   })}
  </section>
  <section className="card" style={{position:'sticky',bottom:0,zIndex:3,boxShadow:'0 -6px 24px rgba(0,0,0,0.07)'}}>
   <form action={askJarvisAction}>
    <label htmlFor="jarvis-prompt"><strong>Votre instruction à JARVIS</strong></label>
    <textarea id="jarvis-prompt" name="prompt" rows={3} maxLength={3000} required placeholder="Monsieur, que puis-je faire pour vous ?"/>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
     <small className="muted">Lecture automatique · modifications soumises à validation.</small><button type="submit">Envoyer à JARVIS ↗</button>
    </div>
   </form>
  </section>
 </div>;
}
