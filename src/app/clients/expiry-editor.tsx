'use client';
import {useActionState} from 'react';
import {editSubscriptionAction} from '@/app/actions/manual-entry';
export default function ExpiryEditor({id,customerId,expiresAt,price,lifetime,locked}:{id:string;customerId:string;expiresAt:string|null;price:number;lifetime:boolean;locked:boolean}){
 const [state,action,pending]=useActionState(editSubscriptionAction,{error:''});
 return <details className="editor-details"><summary>Modifier la fiche</summary>
  <form action={action} className="editor-form">
   <input name="subscriptionId" type="hidden" value={id}/>
   <input name="customerId" type="hidden" value={customerId}/>
   {!lifetime&&<label>Nouvelle expiration<input type="date" required name="expiresAt" defaultValue={expiresAt?expiresAt.slice(0,10):''}/></label>}
   {lifetime&&<input type="hidden" name="expiresAt" value=""/>}
   <label>Prix convenu (FCFA)<input type="number" name="price" defaultValue={price} disabled={locked} min="1" required={!locked}/></label>
   {locked&&<><input name="price" type="hidden" value={price}/><p className="muted">Le prix ne peut plus être changé : un paiement est déjà déclaré.</p></>}
   {state.error&&<div role="alert" className="entry-error">{state.error}</div>}
   <button type="submit" disabled={pending}>{pending?'Enregistrement…':'Enregistrer les modifications'}</button>
  </form>
 </details>;
}
