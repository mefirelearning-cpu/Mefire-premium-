import Link from 'next/link';
import {getConversation,listConversations} from '@/lib/inbox';
import {manualReplyAction,proposeSupportProcedureAction,returnToAIAction,takeoverAction} from '@/app/actions/inbox';
export const dynamic='force-dynamic';

function mediaFromContent(content:string){
 const m=content.match(/^\[\[WA_IMAGE:([A-Za-z0-9._:-]+)\]\](?:\n([\s\S]*))?$/);
 return m?{id:m[1],caption:m[2]?.trim()||''}:null;
}

export default async function Inbox({searchParams}:{searchParams:Promise<{id?:string;learning?:string}>}){
 if(!process.env.DATABASE_URL)return <><h1>Inbox WhatsApp</h1><div className="card"><p className="muted">DATABASE_URL doit être configurée pour charger les conversations.</p></div></>;
 const {id,learning}=await searchParams;
 const list=await listConversations();
 const selected=id?await getConversation(id):null;
 return <>
  <div className="top">
   <div><h1>Inbox WhatsApp</h1><div className="muted">Conversations clients avec contrôle IA / humain.</div></div>
   <strong>{list.filter(x=>x.humanTakeover).length} à traiter</strong>
  </div>
  <section className="cols" style={{marginTop:24}}>
   <div className="card">
    <h2>Conversations</h2>
    {list.length===0?<p className="muted">Aucune conversation.</p>:list.map(c=>
     <Link className="row" key={c.id} href={'/inbox?id='+c.id}>
      <span><b>{[c.firstName,c.lastName].filter(Boolean).join(' ')||c.phone}</b><br/><small className="muted">{c.phone}</small></span>
      <strong>{c.humanTakeover?'Humain':'IA'}</strong>
     </Link>
    )}
   </div>
   <div className="card">
    {!selected?<><h2>Aucune conversation sélectionnée</h2><p className="muted">Sélectionne un client à gauche.</p></>:<>
     <div className="top">
      <div><h2>{[selected.conversation.firstName,selected.conversation.lastName].filter(Boolean).join(' ')||selected.conversation.phone}</h2><div className="muted">{selected.conversation.phone}</div></div>
      {selected.conversation.humanTakeover?
       <form action={returnToAIAction}><input type="hidden" name="conversationId" value={selected.conversation.id}/><button>Rendre à l’IA</button></form>:
       <form action={takeoverAction}><input type="hidden" name="conversationId" value={selected.conversation.id}/><button>Prendre la main</button></form>}
     </div>
     <div style={{margin:'20px 0',maxHeight:520,overflow:'auto'}}>
      {selected.messages.map(m=>{
       const media=mediaFromContent(m.content);
       return <div key={m.id} className="row">
        <span className="message-copy">
         <b>{m.direction==='in'?'Client':m.senderType==='ai'?'IA':m.senderType==='automation'?'Automatisation':'Admin'}</b><br/>
         {media?<><a href={'/api/whatsapp/media/'+encodeURIComponent(media.id)} target="_blank" rel="noreferrer"><img className="proof-image" src={'/api/whatsapp/media/'+encodeURIComponent(media.id)} alt="Capture envoyée par le client"/></a>{media.caption?<><br/><span>{media.caption}</span></>:null}<br/><small className="muted">Capture / image WhatsApp reçue</small></>:m.content}
        </span>
        <small className="muted">{new Date(m.createdAt).toLocaleString('fr-FR',{timeZone:'Africa/Douala'})}</small>
       </div>;
      })}
     </div>
     {learning==='1'&&<div className="notice">✓ Proposition enregistrée. Elle n’est pas encore utilisée par JARVIS : valide-la dans <Link href="/memoire">Mémoire commerciale</Link>.</div>}
     <form action={manualReplyAction}>
      <input type="hidden" name="conversationId" value={selected.conversation.id}/>
      <textarea name="text" required rows={3} placeholder="Écrire une réponse manuelle…"/>
      <button type="submit">Envoyer et prendre la main</button>
     </form>
     {selected.conversation.humanTakeover?
      <form action={proposeSupportProcedureAction} className="card" style={{marginTop:18}}>
       <h2>Capitaliser sur cette intervention</h2>
       <p className="muted">Décris le problème et la solution réellement testée. JARVIS ne pourra l’utiliser qu’après ta validation.</p>
       <input type="hidden" name="conversationId" value={selected.conversation.id}/>
       <label>Problème rencontré *</label>
       <input name="title" required minLength={4} maxLength={160} placeholder="Ex. Le client ne peut pas rejoindre son profil"/>
       <label>Service concerné</label>
       <input name="serviceName" maxLength={100} placeholder="Ex. Netflix, Prime Video…"/>
       <label>Symptômes observés *</label>
       <textarea name="symptom" required minLength={12} maxLength={2500} rows={3} placeholder="Que voit le client ? À quel moment le problème apparaît-il ?"/>
       <label>Solution testée et validée *</label>
       <textarea name="resolution" required minLength={12} maxLength={2500} rows={4} placeholder="Décris les étapes qui ont réellement résolu le problème."/>
       <p className="muted">Ne saisis aucun mot de passe, OTP, code de vérification ni donnée privée du client.</p>
       <button type="submit">Proposer à la mémoire de JARVIS</button>
      </form>:
      <p className="muted" style={{marginTop:16}}>Pour enregistrer une procédure, prends d’abord la main sur cette conversation.</p>}
    </>}
   </div>
  </section>
 </>;
}
