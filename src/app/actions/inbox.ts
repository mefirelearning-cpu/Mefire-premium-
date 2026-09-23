'use server';
import {revalidatePath} from 'next/cache';
import {sendManualReply,setHumanTakeover} from '@/lib/inbox';
const val=(f:FormData,k:string)=>{const v=String(f.get(k)||'').trim();if(!v)throw new Error(`${k} requis`);return v};
export async function takeoverAction(f:FormData){const id=val(f,'conversationId');await setHumanTakeover(id,true);revalidatePath('/inbox');}
export async function returnToAIAction(f:FormData){const id=val(f,'conversationId');await setHumanTakeover(id,false);revalidatePath('/inbox');}
export async function manualReplyAction(f:FormData){const id=val(f,'conversationId'),text=val(f,'text');await sendManualReply(id,text);revalidatePath('/inbox');}
