'use server';
import {revalidatePath} from 'next/cache';
import {cancelAdminCommand,executeAdminCommand,proposeAdminCommand} from '@/lib/admin-agent';

const required=(f:FormData,k:string)=>{const v=String(f.get(k)||'').trim();if(!v)throw new Error(`${k} requis`);return v;};
const refresh=()=>{revalidatePath('/mefire-ai');revalidatePath('/jarvis');};

export async function proposeMefireAIAction(form:FormData){
 await proposeAdminCommand(required(form,'prompt'));
 refresh();
}

export async function confirmMefireAIAction(form:FormData){
 await executeAdminCommand(required(form,'commandId'));
 refresh();
}

export async function cancelMefireAIAction(form:FormData){
 await cancelAdminCommand(required(form,'commandId'));
 refresh();
}
