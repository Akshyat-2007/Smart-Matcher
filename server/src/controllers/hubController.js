import { z } from 'zod';
import { dataAccess } from '../services/dataAccess.js';

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000)
});

const feedbackSchema = z.object({
  revieweeId: z.number().int().positive(),
  productive: z.boolean(),
  comments: z.string().optional().default(''),
  requestReshuffle: z.boolean().optional().default(false)
});

export const hubController = {
  // GET /api/groups/:id/hub
  async getHub(req, res) {
    try {
      const matchId = parseInt(req.params.id, 10);
      const hubData = await dataAccess.getGroupHub(matchId);

      if (!hubData) {
        return res.status(404).json({ error: 'Study group not found.' });
      }

      return res.json(hubData);
    } catch (err) {
      console.error('[HUB GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve group hub.' });
    }
  },

  // POST /api/groups/:id/messages
  async sendMessage(req, res) {
    try {
      const matchId = parseInt(req.params.id, 10);
      const parsed = messageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const userId = req.user.id;
      const msg = await dataAccess.addMessage(matchId, userId, parsed.data.content);
      return res.status(201).json({ message: 'Message sent.', data: msg });
    } catch (err) {
      console.error('[HUB MSG ERROR]', err);
      return res.status(500).json({ error: 'Failed to send message.' });
    }
  },

  // POST /api/sessions/:id/checkin
  async checkin(req, res) {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const attended = req.body.attended !== false;

      await dataAccess.checkinSession(sessionId, userId, attended);
      return res.json({ message: 'Attendance logged successfully.', attended });
    } catch (err) {
      console.error('[CHECKIN ERROR]', err);
      return res.status(500).json({ error: 'Failed to log attendance.' });
    }
  },

  // POST /api/sessions/:id/feedback
  async submitFeedback(req, res) {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const reviewerId = req.user.id;
      const parsed = feedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const result = await dataAccess.submitFeedback({
        sessionId,
        reviewerId,
        revieweeId: parsed.data.revieweeId,
        productive: parsed.data.productive,
        comments: parsed.data.comments,
        requestReshuffle: parsed.data.requestReshuffle
      });

      return res.json({
        message: 'Feedback recorded. Student reliability score adjusted.',
        ...result
      });
    } catch (err) {
      console.error('[FEEDBACK ERROR]', err);
      return res.status(500).json({ error: 'Failed to record feedback.' });
    }
  },

  // POST /api/milestones/:id/checkoff
  async checkoffMilestone(req, res) {
    try {
      const milestoneId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      await dataAccess.checkoffMilestone(milestoneId, userId);
      return res.json({ message: 'Milestone checked off.' });
    } catch (err) {
      console.error('[MILESTONE CHECKOFF ERROR]', err);
      return res.status(500).json({ error: 'Failed to check off milestone.' });
    }
  },

  // POST /api/milestones/:id/reschedule (Adaptive Plan)
  async rescheduleMilestone(req, res) {
    try {
      const milestoneId = parseInt(req.params.id, 10);
      const daysToAdd = req.body.daysToAdd || 3;
      const newDueDate = new Date(Date.now() + daysToAdd * 24 * 3600 * 1000);

      await dataAccess.rescheduleMilestone(milestoneId, newDueDate);
      return res.json({
        message: `Adaptive plan triggered: Milestone rescheduled by ${daysToAdd} days with lighter 15-min catch-up session.`,
        newDueDate
      });
    } catch (err) {
      console.error('[RESCHEDULE ERROR]', err);
      return res.status(500).json({ error: 'Failed to reschedule milestone.' });
    }
  },

  // GET /api/notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const notifications = await dataAccess.getNotifications(userId);
      return res.json({ notifications });
    } catch (err) {
      console.error('[NOTIFICATION ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
  },

  // POST /api/notifications/:id/read
  async markNotificationRead(req, res) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      await dataAccess.markNotificationRead(notificationId, userId);
      return res.json({ message: 'Marked as read.' });
    } catch (err) {
      console.error('[NOTIFICATION READ ERROR]', err);
      return res.status(500).json({ error: 'Failed to update notification.' });
    }
  },

  // --- DISCOVERY & SUGGESTED PEERS ---
  // GET /api/discovery/partners
  async getDiscoveryCandidates(req, res) {
    try {
      const userId = req.user.id;
      const { subjectSlug = 'dsa', goal = null } = req.query;
      const candidates = await dataAccess.getDiscoveryCandidates(userId, { subjectSlug, goal });
      return res.json({ candidates });
    } catch (err) {
      console.error('[DISCOVERY CANDIDATES ERROR]', err);
      return res.status(500).json({ error: 'Failed to discover peer candidates.' });
    }
  },

  // GET /api/discovery/requests
  async getPartnerRequests(req, res) {
    try {
      const userId = req.user.id;
      const requests = await dataAccess.getPartnerRequests(userId);
      return res.json({ requests });
    } catch (err) {
      console.error('[PARTNER REQUESTS GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch partner requests.' });
    }
  },

  // POST /api/discovery/requests
  async sendPartnerRequest(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId, subjectSlug = 'dsa', note = '' } = req.body;
      if (!receiverId) {
        return res.status(400).json({ error: 'receiverId is required.' });
      }

      const request = await dataAccess.sendPartnerRequest(senderId, { receiverId, subjectSlug, note });
      return res.status(201).json({ message: 'Partner request sent successfully via Zoom.', request });
    } catch (err) {
      console.error('[SEND PARTNER REQUEST ERROR]', err);
      return res.status(500).json({ error: 'Failed to send partner request.' });
    }
  },

  // POST /api/discovery/requests/:id/respond
  async respondPartnerRequest(req, res) {
    try {
      const requestId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const { action } = req.body; // 'accepted', 'declined', 'skipped'

      if (!['accepted', 'declined', 'skipped'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Must be accepted, declined, or skipped.' });
      }

      const result = await dataAccess.respondPartnerRequest(requestId, userId, { action });
      return res.json(result);
    } catch (err) {
      console.error('[RESPOND PARTNER REQUEST ERROR]', err);
      return res.status(500).json({ error: 'Failed to respond to partner request.' });
    }
  },

  // --- STUDY GROUPS ---
  // POST /api/groups/create
  async createStudyGroup(req, res) {
    try {
      const creatorId = req.user.id;
      const { name, subjectSlug = 'dsa', sizeLimit = 4, goal = 'exam_prep' } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required.' });
      }

      const group = await dataAccess.createStudyGroup({
        creatorId,
        name: name.trim(),
        subjectSlug,
        sizeLimit: parseInt(sizeLimit, 10) || 4,
        goal
      });

      return res.status(201).json({ message: 'Study group created successfully.', group });
    } catch (err) {
      console.error('[CREATE GROUP ERROR]', err);
      return res.status(500).json({ error: 'Failed to create study group.' });
    }
  },

  // GET /api/groups/available
  async getAvailableGroups(req, res) {
    try {
      const { subjectSlug = null } = req.query;
      const groups = await dataAccess.getAvailableGroups(subjectSlug);
      return res.json({ groups });
    } catch (err) {
      console.error('[AVAILABLE GROUPS ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch study groups.' });
    }
  },

  // POST /api/groups/:id/join
  async joinStudyGroup(req, res) {
    try {
      const matchId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const result = await dataAccess.joinStudyGroup(matchId, userId);
      return res.json(result);
    } catch (err) {
      console.error('[JOIN GROUP ERROR]', err);
      return res.status(400).json({ error: err.message || 'Failed to join group.' });
    }
  },

  // --- GROUP RESOURCES ---
  // GET /api/groups/:id/resources
  async getGroupResources(req, res) {
    try {
      const matchId = parseInt(req.params.id, 10);
      const resources = await dataAccess.getGroupResources(matchId);
      return res.json({ resources });
    } catch (err) {
      console.error('[GET RESOURCES ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch group resources.' });
    }
  },

  // POST /api/groups/:id/resources
  async addGroupResource(req, res) {
    try {
      const matchId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const { title, url, note, type = 'link' } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Resource title is required.' });
      }

      const resource = await dataAccess.addGroupResource(matchId, userId, {
        title: title.trim(),
        url: url?.trim() || '',
        note: note?.trim() || '',
        type
      });

      return res.status(201).json({ message: 'Resource shared.', resource });
    } catch (err) {
      console.error('[ADD RESOURCE ERROR]', err);
      return res.status(500).json({ error: 'Failed to share resource.' });
    }
  },

  // --- 1:1 DIRECT CHAT ---
  // GET /api/direct-messages/:partnerId
  async getDirectMessages(req, res) {
    try {
      const userId = req.user.id;
      const partnerId = parseInt(req.params.partnerId, 10);
      const messages = await dataAccess.getDirectMessages(userId, partnerId);
      return res.json({ messages });
    } catch (err) {
      console.error('[DIRECT MSG GET ERROR]', err);
      return res.status(500).json({ error: 'Failed to fetch direct messages.' });
    }
  },

  // POST /api/direct-messages/:partnerId
  async sendDirectMessage(req, res) {
    try {
      const userId = req.user.id;
      const partnerId = parseInt(req.params.partnerId, 10);
      const { content, isIcebreaker = false } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
      }

      const msg = await dataAccess.sendDirectMessage(userId, partnerId, {
        content: content.trim(),
        isIcebreaker
      });

      return res.status(201).json({ message: 'Message delivered.', data: msg });
    } catch (err) {
      console.error('[DIRECT MSG SEND ERROR]', err);
      return res.status(500).json({ error: 'Failed to send direct message.' });
    }
  },

  // --- SCHEDULING & BEST TIME SLOT ---
  // GET /api/groups/:id/schedule/best-slot
  async getBestTimeSlot(req, res) {
    try {
      const matchId = parseInt(req.params.id, 10);
      const recommendation = await dataAccess.getBestTimeSlot(matchId);
      return res.json({ recommendation });
    } catch (err) {
      console.error('[BEST TIME SLOT ERROR]', err);
      return res.status(500).json({ error: 'Failed to compute best time slot.' });
    }
  },

  // POST /api/groups/:id/schedule/session
  async scheduleSession(req, res) {
    try {
      const matchId = parseInt(req.params.id, 10);
      const { scheduledAt, topicA, topicB, icebreakerText } = req.body;

      const session = await dataAccess.scheduleGroupSession(matchId, {
        scheduledAt,
        topicA,
        topicB,
        icebreakerText
      });

      return res.status(201).json({ message: 'Teach-swap session scheduled on shared calendar.', session });
    } catch (err) {
      console.error('[SCHEDULE SESSION ERROR]', err);
      return res.status(500).json({ error: 'Failed to schedule session.' });
    }
  }
};
