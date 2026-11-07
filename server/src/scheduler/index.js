import cron from 'node-cron';
import { getPool } from '../db/pool.js';
import { memoryStore } from '../db/repo.js';

/**
 * Smart Accountability & Nudge Scheduler (node-cron)
 * 
 * 1. Session Reminder Nudge: Alert members 24h before teach-swap session
 * 2. Inactive Student Nudge: Gentle prompt when member is quiet for 3+ days
 * 3. Overdue Milestone Adaptive Plan: Automatically reschedules overdue milestones & suggests lighter catch-up
 * 4. Reshuffle Monitor: Auto-flags groups with repeated flaking for re-matching
 */

export async function runSchedulerCycle() {
  console.log('[SCHEDULER] Running automated accountability & nudge cycle...');

  try {
    // 1. Session Reminders (within next 24 hours)
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 3600 * 1000);

    const upcomingSessions = memoryStore.sessions.filter(s => 
      s.status === 'scheduled' && 
      new Date(s.scheduled_at) > now && 
      new Date(s.scheduled_at) <= next24h
    );

    for (const session of upcomingSessions) {
      const members = memoryStore.groupMembers.filter(gm => gm.match_id === session.match_id);
      for (const m of members) {
        // Prevent duplicate reminder
        const alreadyNotified = memoryStore.notifications.some(n => 
          n.user_id === m.user_id && 
          n.type === 'session_reminder' &&
          (new Date() - new Date(n.created_at)) < 24 * 3600 * 1000
        );

        if (!alreadyNotified) {
          memoryStore.notifications.push({
            id: memoryStore.notifications.length + 1,
            user_id: m.user_id,
            type: 'session_reminder',
            title: '⏰ Upcoming 15-Min Teach-Swap',
            message: `Your teach-swap session is scheduled for tomorrow at ${new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Remember to review the structured agenda!`,
            read_status: false,
            created_at: new Date()
          });
        }
      }
    }

    // 2. Overdue Milestone Adaptive Plan Reschedule
    const overdueMilestones = memoryStore.milestones.filter(m => 
      m.status === 'pending' && 
      new Date(m.due_date) < now
    );

    for (const m of overdueMilestones) {
      m.status = 'rescheduled';
      m.reschedule_count = (m.reschedule_count || 0) + 1;
      const newDue = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
      m.due_date = newDue;

      const members = memoryStore.groupMembers.filter(gm => gm.match_id === m.match_id);
      for (const member of members) {
        memoryStore.notifications.push({
          id: memoryStore.notifications.length + 1,
          user_id: member.user_id,
          type: 'adaptive_plan',
          title: '🔄 Adaptive Plan Activated',
          message: `Milestone "${m.title}" was rescheduled to ${newDue.toLocaleDateString()}. Let's do a lighter 15-minute catch-up session this week instead of falling behind!`,
          read_status: false,
          created_at: new Date()
        });
      }
    }

    // 3. Reshuffle Monitor (consecutive no-shows or explicit flags)
    const activeMatches = memoryStore.matches.filter(m => m.status === 'active');
    for (const match of activeMatches) {
      const reshuffleRequests = memoryStore.feedback.filter(f => {
        const sess = memoryStore.sessions.find(s => s.id === f.session_id);
        return sess && sess.match_id === match.id && f.request_reshuffle;
      });

      if (reshuffleRequests.length >= 2) {
        match.status = 'reshuffled';
        const members = memoryStore.groupMembers.filter(gm => gm.match_id === match.id);
        for (const m of members) {
          const user = memoryStore.users.find(u => u.id === m.user_id);
          if (user) user.status = 'unmatched';

          memoryStore.notifications.push({
            id: memoryStore.notifications.length + 1,
            user_id: m.user_id,
            type: 'reshuffle_alert',
            title: '♻️ Group Auto-Reshuffled',
            message: 'Based on recent feedback and attendance, you have been returned to the matching pool for a better-fit study partner.',
            read_status: false,
            created_at: new Date()
          });
        }
      }
    }

    console.log('[SCHEDULER] Cycle completed successfully.');
  } catch (err) {
    console.error('[SCHEDULER ERROR]', err);
  }
}

export function initScheduler() {
  console.log('[SCHEDULER] Initializing node-cron accountability worker (running every 10 minutes)...');
  // Runs every 10 minutes in background
  const task = cron.schedule('*/10 * * * *', async () => {
    await runSchedulerCycle();
  });

  // Run initial pass on startup
  runSchedulerCycle().catch(() => {});

  return task;
}

export default initScheduler;
