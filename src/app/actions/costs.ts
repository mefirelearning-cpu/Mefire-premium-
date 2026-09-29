'use server';
import {revalidatePath} from 'next/cache';
import {neon} from '@neondatabase/serverless';

export async function saveAiBudgetAction(formData:FormData){
 const url=process.env.DATABASE_URL;
 if(!url)throw new Error('DATABASE_URL manquant');
 const budget=Math.max(0,Number(formData.get('budgetUsd')||0));
 const warning=Math.min(100,Math.max(1,Number(formData.get('warningPercent')||80)));
 const hardLimit=formData.get('hardLimit')==='on';
 const sql=neon(url);
 const rows=await sql`SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1`;
 const businessId=rows[0]?.id;
 if(!businessId)throw new Error('Aucune entreprise configurée');
 await sql`
  INSERT INTO cost_budgets (business_id,category,monthly_budget_usd,warning_percent,hard_limit)
  VALUES (${businessId},'ai',${budget},${warning},${hardLimit})
  ON CONFLICT (business_id,category)
  DO UPDATE SET monthly_budget_usd=EXCLUDED.monthly_budget_usd,warning_percent=EXCLUDED.warning_percent,hard_limit=EXCLUDED.hard_limit,updated_at=now()`;
 revalidatePath('/depenses');
 revalidatePath('/mefire-ai');
}
