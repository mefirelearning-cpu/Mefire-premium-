const yes=(v?:string)=>Boolean(v&&v.trim());

export const dynamic='force-dynamic';

export default function Parametres(){
 const whatsapp={
  token:yes(process.env.WHATSAPP_ACCESS_TOKEN),
  phoneId:yes(process.env.WHATSAPP_PHONE_NUMBER_ID),
  verify:yes(process.env.WHATSAPP_VERIFY_TOKEN),
  secret:yes(process.env.WHATSAPP_APP_SECRET)
 };
 const ai=yes(process.env.OPENAI_API_KEY);
 const whatsappReady=Object.values(whatsapp).every(Boolean);
 return <><div><h1>Paramètres</h1><div className="muted">Contrôle global du CRM, de l’IA, de WhatsApp et de la session administrateur.</div></div>
 <section className="cols" style={{marginTop:24}}>
  <div className="card"><h2>Mode autonome</h2>{[
   ['Créer automatiquement la fiche d’un nouveau client',whatsappReady?'PRÊT':'CONFIGURATION'],
   ['Enregistrer automatiquement les nouveaux messages',whatsappReady?'PRÊT':'CONFIGURATION'],
   ['Répondre avec l’IA et la mémoire commerciale',whatsappReady&&ai?'PRÊT':'CONFIGURATION'],
   ['Présenter les prix depuis le catalogue',whatsappReady&&ai?'PRÊT':'CONFIGURATION'],
   ['Créer automatiquement une commande','À CONNECTER'],
   ['Reconnaître automatiquement un paiement','À CONNECTER'],
   ['Activer les services','MANUEL']
  ].map(([a,s])=><div className="row" key={a}><span>{a}</span><strong>{s}</strong></div>)}</div>
  <div className="card"><h2>WhatsApp Business Platform</h2><div className="row"><span>Access token</span><strong>{whatsapp.token?'Configuré':'Manquant'}</strong></div><div className="row"><span>Phone Number ID</span><strong>{whatsapp.phoneId?'Configuré':'Manquant'}</strong></div><div className="row"><span>Verify token</span><strong>{whatsapp.verify?'Configuré':'Manquant'}</strong></div><div className="row"><span>App Secret / signature webhook</span><strong>{whatsapp.secret?'Configuré':'Manquant'}</strong></div><p className="muted" style={{marginTop:14}}>Webhook à déclarer chez Meta : https://mefire-premium.vercel.app/api/whatsapp/webhook</p><div className="notice">Une fois connecté, chaque nouveau message reçu par l’API est enregistré automatiquement. Le CRM suit aussi les statuts envoyé, livré, lu et échec.</div></div>
  <div className="card"><h2>Sécurité</h2>{['Vérifier la signature Meta des webhooks','Transférer à un humain si incertain','Journaliser les actions sensibles','Bloquer les prix inventés','Pause globale des automatisations'].map(x=><div className="row" key={x}><span>{x}</span><strong>Actif</strong></div>)}</div>
  <div className="card"><h2>Session administrateur</h2><p className="muted">Ferme la session uniquement lorsque tu as terminé d’utiliser le CRM sur cet appareil.</p><div className="settings-actions"><form method="post" action="/api/auth/logout"><button className="danger-button" type="submit">Se déconnecter</button></form></div></div>
  <div className="card"><h2>Compte</h2><p className="muted">Le nom d’utilisateur et le mot de passe administrateur sont gérés de manière sécurisée dans les variables d’environnement du déploiement.</p></div>
 </section></>;
}
