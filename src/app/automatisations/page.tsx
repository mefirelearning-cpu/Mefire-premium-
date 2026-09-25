import {listAutomationOverview} from '@/lib/operations';
import {pauseAutomationsAction,resumeAutomationsAction,toggleAutomationRuleAction} from '@/app/actions/operations';
export const dynamic='force-dynamic';

const jobLabel=(t:string)=>({satisfaction_j2:'Suivi satisfaction J+2',expiration_j7:'Préavis expiration J-7',expiration_j3:'Relance expiration J-3',expiration_j1:'Dernier rappel J-1'} as Record<string,string>)[t]||t;

export default async function AutomationsPage(){
 const {rules,jobs}=await listAutomationOverview();
 const pending=jobs.filter(x=>x.status==='pending').length,paused=jobs.filter(x=>x.status==='paused').length,done=jobs.filter(x=>x.status==='done').length,failed=jobs.filter(x=>x.lastError).length;
 return <><div className="top"><div><h1>Automatisations</h1><div className="muted">Contrôle réel des tâches planifiées et des règles enregistrées.</div></div><div className="automation-controls">{pending>0?<form action={pauseAutomationsAction}><button type="submit" className="secondary-button">Pause générale</button></form>:null}{paused>0?<form action={resumeAutomationsAction}><button type="submit">Reprendre</button></form>:null}</div></div>
 <section className="grid">{[['En attente',pending],['En pause',paused],['Terminées',done],['Avec erreur',failed]].map(([l,v])=><div className="card" key={l}><div className="muted">{l}</div><div className="value">{v}</div></div>)}</section>
 <section className="cols"><div className="card"><h2>Règles configurables</h2>{rules.length===0?<><p className="muted">Aucune règle personnalisée enregistrée.</p><div className="notice">Le cycle système J+2 / J-7 / J-3 / J-1 est déjà créé automatiquement lors de l’activation d’un abonnement.</div></>:rules.map(r=><div className="row" key={r.id}><span><strong>{r.name}</strong><br/><span className="muted">{r.triggerType}</span></span><form action={toggleAutomationRuleAction}><input type="hidden" name="ruleId" value={r.id}/><input type="hidden" name="enabled" value={String(!r.enabled)}/><button type="submit" className="secondary-button">{r.enabled?'Désactiver':'Activer'}</button></form></div>)}</div>
 <div className="card"><h2>Prochaines tâches</h2>{jobs.length===0?<p className="muted">Aucune tâche planifiée.</p>:jobs.slice(0,20).map(j=><div className="row" key={j.id}><span><strong>{jobLabel(j.jobType)}</strong><br/><span className="muted">{new Date(j.runAt).toLocaleString('fr-FR',{timeZone:'Africa/Douala'})}</span></span><strong>{j.status}</strong></div>)}</div></section></>;
}
