import { Router } from 'express';
import { hubController } from '../controllers/hubController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Coordination Hub & Messages
router.get('/groups/:id/hub', requireAuth, hubController.getHub);
router.get('/groups/:id/messages', requireAuth, hubController.getHub);
router.post('/groups/:id/messages', requireAuth, hubController.sendMessage);

// Sessions, Checkin & Productivity Feedback
router.post('/sessions/:id/checkin', requireAuth, hubController.checkin);
router.post('/sessions/:id/feedback', requireAuth, hubController.submitFeedback);

// Milestones
router.post('/milestones/:id/checkoff', requireAuth, hubController.checkoffMilestone);
router.post('/milestones/:id/reschedule', requireAuth, hubController.rescheduleMilestone);

// Notifications & Nudges
router.get('/notifications', requireAuth, hubController.getNotifications);
router.post('/notifications/:id/read', requireAuth, hubController.markNotificationRead);

// Discovery & Suggested Partners
router.get('/discovery/partners', requireAuth, hubController.getDiscoveryCandidates);
router.get('/discovery/requests', requireAuth, hubController.getPartnerRequests);
router.post('/discovery/requests', requireAuth, hubController.sendPartnerRequest);
router.post('/discovery/requests/:id/respond', requireAuth, hubController.respondPartnerRequest);

// Study Groups (Create, Browse, Join)
router.post('/groups/create', requireAuth, hubController.createStudyGroup);
router.get('/groups/available', requireAuth, hubController.getAvailableGroups);
router.post('/groups/:id/join', requireAuth, hubController.joinStudyGroup);

// Group Resources
router.get('/groups/:id/resources', requireAuth, hubController.getGroupResources);
router.post('/groups/:id/resources', requireAuth, hubController.addGroupResource);

// 1:1 Direct Chat
router.get('/direct-messages/:partnerId', requireAuth, hubController.getDirectMessages);
router.post('/direct-messages/:partnerId', requireAuth, hubController.sendDirectMessage);

// Scheduling & Best Slot Suggestion
router.get('/groups/:id/schedule/best-slot', requireAuth, hubController.getBestTimeSlot);
router.post('/groups/:id/schedule/session', requireAuth, hubController.scheduleSession);

export default router;
