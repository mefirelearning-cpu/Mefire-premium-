import {askJarvisAction} from '@/app/actions/jarvis';
import {cancelMefireAIAction,confirmMefireAIAction} from '@/app/actions/mefire-ai';
import {listAdminCommands} from '@/lib/admin-agent';
import {MessageSquareText,ArrowUpRight} from 'lucide-react';
export const dynamic='force-dynamic';
const quick=[
 ['Bilan du jour','Jarvis, donne-moi le bilan des activations et des ventes aujourd’hui.'],
 ['Paiements en attente','Jarvis, quels paiements sont à vérifier aujourd’hui ?'],
 ['Évolution des ventes','Jarvis, sommes-nous en progression ou en baisse aujourd’hui ?']
] as const;
export default async function JarvisPage(){
 const commands=(await listAdminCommands()).reverse();
 return <div className="page-container chat-page">
  <div className="page-header chat-top"><div><div className="eyebrow">VOTRE ASSISTANT</div><h1>Jarvis</h1><p>Posez une question ou donnez une instruction.</p></div>
   <div className="assistant-presence"><span className="online-dot"/> Disponible</div>
  </div>
  {commands.length===0&&<div className="chat-welcome"><span className="chat-avatar"><MessageSquareText size={25}/></span>
   <h2>À votre service.</h2><p>Je peux vous aider à suivre les abonnements, les paiements et les problèmes clients.</p></div>}
  {commands.length===0&&<div className="prompt-chips">{quick.map(([label,prompt])=><form action={askJarvisAction} key={label}><input type="hidden" name="prompt" value={prompt}/><button type="submit">{label}<ArrowUpRight size={15}/></button></form>)}</div>}
  <div className="chat-history" aria-label="Conversation Jarvis">{commands.map(command=>{
   const plan=Array.isArray(command.plan)?command.plan:[];
   const result=command.result&&typeof command.result==='object'?command.result:null;
   const readonly=plan.length===1&&(plan[0] as {type?:string}).type==='jarvis_read_only';
   return <div key={command.id} className="chat-turn">
    <div className="chat-user">{command.prompt}</div>
    <div className="chat-assistant"><span className="chat-avatar small">J</span><div className="chat-answer">
     <p>{command.reformulation||'Instruction enregistrée.'}</p>
     {command.status==='awaiting_confirmation'&&<div className="chat-confirm"><strong>Validation nécessaire</strong><span>Cette demande modifiera des données. Aucune action n’a encore été exécutée.</span>
      <div className="button-row"><form action={confirmMefireAIAction}><input type="hidden" name="commandId" value={command.id}/><button type="submit">Confirmer</button></form>
      <form action={cancelMefireAIAction}><input type="hidden" name="commandId" value={command.id}/><button type="submit" className="secondary-button">Annuler</button></form></div></div>}
     {command.status==='executed'&&!readonly&&<details className="editor-details"><summary>✓ Action effectuée — voir les détails</summary><pre className="report-output">{JSON.stringify(result,null,2)?.slice(0,2500)}</pre></details>}
     {command.status==='failed'&&<div className="entry-error">{command.error||'Cette demande n’a pas abouti.'}</div>}
     {command.status==='cancelled'&&<small className="muted">Instruction annulée.</small>}
    </div></div>
   </div>;
  })}</div>
  <section className="chat-compose"><form action={askJarvisAction}>
   <label className="visually-hidden" htmlFor="jarvis-prompt">Écrire à Jarvis</label>
   <textarea id="jarvis-prompt" name="prompt" rows={2} maxLength={3000} placeholder="Écrire à Jarvis…" required/>
   <div className="compose-bottom"><small>Les opérations importantes nécessitent votre validation.</small><button type="submit">Envoyer ↗</button></div>
  </form></section>
 </div>;
}
