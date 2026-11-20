'use server';
import {revalidatePath} from 'next/cache';
import {sendManualReply,setHumanTakeover} from '@/lib/inbox';
import {proposeSupportProcedure} from '@/lib/commercial-memory';
import {redirect} from 'next/navigation';
const val=(f:FormData,k:string)=>{const v=String(f.get(k)||'').trim();if(!v)throw new Error(`${k} requis`);return v};
export async function takeoverAction(f:FormData){const id=val(f,'conversationId');await setHumanTakeover(id,true);revalidatePath('/inbox');}
export async function returnToAIAction(f:FormData){const id=val(f,'conversationId');await setHumanTakeover(id,false);revalidatePath('/inbox');}
export async function manualReplyAction(f:FormData){const id=val(f,'conversationId'),text=val(f,'text');await sendManualReply(id,text);revalidatePath('/inbox');}


export async function proposeSupportProcedureAction(f:FormData){
 const conversationId=val(f,'conversationId');
 await proposeSupportProcedure({
  conversationId,
  title:val(f,'title'),
  serviceName:String(f.get('serviceName')||'').trim(),
  symptom:val(f,'symptom'),
  resolution:val(f,'resolution')
 });
 revalidatePath('/inbox');
 revalidatePath('/memoire');
 revalidatePath('/jarvis');
 redirect('/inbox?id='+encodeURIComponent(conversationId)+'&learning=1');
}
