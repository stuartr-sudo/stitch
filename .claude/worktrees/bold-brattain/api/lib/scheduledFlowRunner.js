import { Cron } from 'croner';
import { executeFlow } from './flowExecutor.js';
import { getUserKeys } from './getUserKeys.js';

export function startScheduledFlowRunner(supabase) {
  console.log('[flows] Scheduled flow runner started');

  setInterval(async () => {
    try {
      const { data: flows } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('trigger_type', 'scheduled')
        .not('schedule_cron', 'is', null);

      if (!flows?.length) return;

      const now = new Date();

      for (const flow of flows) {
        try {
          const cron = new Cron(flow.schedule_cron);
          const prev = cron.previousRun();
          if (!prev) continue;

          // Dedup: skip if last_triggered_at is after the previous cron tick
          if (flow.last_triggered_at && new Date(flow.last_triggered_at) >= prev) continue;

          // Check if prev is within the last 60s (current polling window)
          if (now - prev > 60000) continue;

          console.log(`[flows] Triggering scheduled flow: ${flow.name} (${flow.id})`);

          // Update last_triggered_at
          await supabase
            .from('automation_flows')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', flow.id);

          // Execute
          // getUserKeys(userId, userEmail) — look up email for OWNER_EMAIL fallback
          let userEmail = null;
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(flow.user_id);
            userEmail = userData?.user?.email || null;
          } catch (e) { /* proceed without email — non-owner users still work */ }
          const keys = await getUserKeys(flow.user_id, userEmail);
          await executeFlow(flow, supabase, keys, flow.user_id, userEmail);
        } catch (err) {
          console.error(`[flows] Error triggering flow ${flow.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[flows] Scheduled runner error:', err.message);
    }
  }, 60000); // Every 60 seconds
}
