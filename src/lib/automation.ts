export type ReminderStage='J-7'|'J-3'|'J-1'|'EXPIRED';
export function reminderStage(expiresAt:Date,now=new Date()):ReminderStage|null{const ms=expiresAt.getTime()-now.getTime();const days=Math.ceil(ms/86400000);if(days===7)return'J-7';if(days===3)return'J-3';if(days===1)return'J-1';if(days<=0)return'EXPIRED';return null;}
export function idempotencyKey(subscriptionId:string,stage:ReminderStage,expiresAt:Date){return `${subscriptionId}:${stage}:${expiresAt.toISOString().slice(0,10)}`;}
export const defaultFollowups=[{key:'J+2',offsetDays:2,type:'satisfaction'},{key:'J-7',offsetDays:-7,type:'expiration'},{key:'J-3',offsetDays:-3,type:'expiration'},{key:'J-1',offsetDays:-1,type:'expiration'}] as const;
