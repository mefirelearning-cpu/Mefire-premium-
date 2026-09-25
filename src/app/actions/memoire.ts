'use server';
import {revalidatePath} from 'next/cache';
import {createMemoryEntry,toggleMemoryEntry} from '@/lib/commercial-memory';

const value=(form:FormData,key:string)=>String(form.get(key)??'').trim();

export async function createMemoryAction(form:FormData){
 const kind=value(form,'kind');
 const content=value(form,'content');
 if(!kind)throw new Error('Type requis');
 if(!content)throw new Error('Contenu requis');
 await createMemoryEntry({kind,title:value(form,'title')||undefined,content,customerId:value(form,'customerId')||undefined,language:value(form,'language')||'fr'});
 revalidatePath('/memoire');
}

export async function toggleMemoryAction(form:FormData){
 const id=value(form,'id');
 if(!id)throw new Error('Mémoire requise');
 await toggleMemoryEntry(id,value(form,'active')==='true');
 revalidatePath('/memoire');
}
