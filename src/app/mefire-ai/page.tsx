import {cancelMefireAIAction,confirmMefireAIAction,proposeMefireAIAction} from '@/app/actions/mefire-ai';
import {listAdminCommands} from '@/lib/admin-agent';
import {aiProviderStatus} from '@/lib/ai-provider';
export const dynamic='force-dynamic';

function statusLabel(status:string){
 const map:Record<string,string>={awaiting_confirmation:'À confirmer',executing:'Exécution…',executed:'Exécuté',failed:'Échec',cancelled:'Annulé',draft:'Brouillon'};
 return map[status]||status;
}

export default async function MefireAIPage(){
 const [commands,provider]=await Promise.all([listAdminCommands(),Promise.resolve(aiProviderStatus())]);
 return <>
  <div className="top"><div><h1>Mefire AI</h1><div className="muted">Centre de commande administrateur : demande libre → reformulation → confirmation → exécution.</div></div></div>
  <section className="grid" style={{marginTop:20}}>
   <div className="card"><div className="muted">Fournisseur IA</div><div className="value" style={{fontSize:24}}>{provider.provider}</div><div className="muted">{provider.configured?provider.model:'Clé API à configurer'}</div></div>
   <div className="card"><div className="muted">Commandes récentes</div><div className="value">{commands.length}</div><div className="muted">Toutes les modifications passent par confirmation.</div></div>
  </section>

  <section className="card" style={{marginTop:20}}>
   <h2>Demander à Mefire AI</h2>
   <p className="muted">Écris naturellement. L’IA ne touche à rien avant de te montrer ce qu’elle a compris.</p>
   <form action={proposeMefireAIAction}>
    <textarea name="prompt" rows={5} required placeholder="Ex. Trouve tous les clients Netflix actifs, ajoute l’étiquette Netflix et prépare un message pour ceux qui expirent dans 7 jours."/>
    <button type="submit">Analyser ma demande</button>
   </form>
  </section>

  <section style={{marginTop:20}}>
   <h2>Historique des commandes</h2>
   {commands.length===0?<div className="card"><p className="muted">Aucune commande enregistrée pour le moment.</p></div>:commands.map(command=>{
    const plan=Array.isArray(command.plan)?command.plan:[];
    const result=command.result&&typeof command.result==='object'?command.result:null;
    return <div className="card" key={command.id} style={{marginBottom:14}}>
     <div className="row"><span><strong>{statusLabel(command.status)}</strong><br/><span className="muted">{new Date(command.createdAt).toLocaleString('fr-FR')}</span></span><span className="muted">#{command.id.slice(0,8)}</span></div>
     <p><strong>Ta demande</strong><br/>{command.prompt}</p>
     {command.reformulation&&<div className="notice"><strong>Ce que Mefire AI a compris</strong><br/>{command.reformulation}</div>}
     {plan.length>0&&<div style={{marginTop:12}}><strong>Plan</strong>{plan.map((action:any,index:number)=><div className="row" key={index}><span>{index+1}. {String(action?.type||'action')}</span><span className="muted">{Object.keys(action?.args||{}).length} paramètre(s)</span></div>)}</div>}
     {command.status==='awaiting_confirmation'&&<div className="settings-actions" style={{marginTop:14,display:'flex',gap:10,flexWrap:'wrap'}}>
      <form action={confirmMefireAIAction}><input type="hidden" name="commandId" value={command.id}/><button type="submit">Confirmer et exécuter</button></form>
      <form action={cancelMefireAIAction}><input type="hidden" name="commandId" value={command.id}/><button type="submit" className="danger-button">Annuler</button></form>
     </div>}
     {command.status==='executed'&&result&&<div className="notice" style={{marginTop:12}}><strong>Exécution terminée ✅</strong><br/>Les actions ont été appliquées et journalisées dans le CRM.</div>}
     {command.status==='failed'&&<div className="notice" style={{marginTop:12}}><strong>Erreur</strong><br/>{command.error||'Erreur inconnue'}</div>}
    </div>;
   })}
  </section>
 </>;
}
