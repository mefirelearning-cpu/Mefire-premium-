import {eq,and,lte,gte} from 'drizzle-orm';
import {db} from '@/db';
import {subscriptions} from '@/db/schema';
import {reminderStage,idempotencyKey} from './automation';

export type ScheduledReminder={subscriptionId:string;stage:string;expiresAt:Date;idempotencyKey:string};

export async function findDueExpirationReminders(now=new Date()):Promise<ScheduledReminder[]>{
  const from=new Date(now); from.setUTCHours(0,0,0,0);
  const to=new Date(from); to.setUTCDate(to.getUTCDate()+8);
  const rows=await db.select({id:subscriptions.id,expiresAt:subscriptions.expiresAt})
    .from(subscriptions)
    .where(and(eq(subscriptions.status,'active'),gte(subscriptions.expiresAt,from),lte(subscriptions.expiresAt,to)));
  return rows.flatMap(row=>{
    if(!row.expiresAt)return [];
    const stage=reminderStage(row.expiresAt,now);
    return stage?[{subscriptionId:row.id,stage,expiresAt:row.expiresAt,idempotencyKey:idempotencyKey(row.id,stage,row.expiresAt)}]:[];
  });
}
