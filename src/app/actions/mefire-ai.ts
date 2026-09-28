'use server';
import {revalidatePath} from 'next/cache';
import {cancelAdminCommand,executeAdminCommand,proposeAdminCommand} from '@/lib/admin-agent';

const required=(f:FormData,k:string)=>{const v=String(f.get(k)||'').trim();if(!v)throw new Error(`${k} requis`);return v;};

export async function proposeMefireAIAction(form:FormData){
 await proposeAdminCommand(required(form,'prompt'));
 revalidatePath('/mefire-ai');
}

export async function confirmMefireAIAction(form:FormData){
 await executeAdminCommand(required(form,'commandId'));
 revalidatePath('/mefire-ai');
}

export async function cancelMefireAIAction(form:FormData){
 await cancelAdminCommand(required(form,'commandId'));
 revalidatePath('/mefire-ai');
}
