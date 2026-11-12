'use server';
import {revalidatePath} from 'next/cache';
import {submitJarvisRequest} from '@/lib/jarvis-chat';

export async function askJarvisAction(formData:FormData){
 const prompt=String(formData.get('prompt')||'').trim();
 if(!prompt)throw new Error('Un message est requis');
 await submitJarvisRequest(prompt);
 revalidatePath('/jarvis');
}
