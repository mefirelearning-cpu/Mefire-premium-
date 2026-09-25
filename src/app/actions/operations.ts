'use server';
import {revalidatePath} from 'next/cache';
import {pauseAutomations,resolveSupportConversation,resumeAutomations,toggleAutomationRule} from '@/lib/operations';
const val=(f:FormData,k:string)=>{const v=String(f.get(k)||'').trim();if(!v)throw new Error(`${k} requis`);return v};
export async function resolveSupportAction(f:FormData){await resolveSupportConversation(val(f,'conversationId'));revalidatePath('/sav');revalidatePath('/inbox');revalidatePath('/');}
export async function pauseAutomationsAction(){await pauseAutomations();revalidatePath('/automatisations');revalidatePath('/');}
export async function resumeAutomationsAction(){await resumeAutomations();revalidatePath('/automatisations');revalidatePath('/');}
export async function toggleAutomationRuleAction(f:FormData){const id=val(f,'ruleId');const enabled=val(f,'enabled')==='true';await toggleAutomationRule(id,enabled);revalidatePath('/automatisations');}
