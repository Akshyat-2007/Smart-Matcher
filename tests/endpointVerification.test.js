import test from 'node:test';
import assert from 'node:assert/strict';
import { dataAccess } from '../server/src/services/dataAccess.js';

test('Integration Test: Exclusively Zoom Meets & Study Matching Methods', async (t) => {
  // 1. User & Auth
  const alice = await dataAccess.findUserByEmail('alice@demo.com');
  assert.ok(alice);
  assert.equal(alice.email, 'alice@demo.com');

  // 2. Discovery Candidates (Suggested partners with match score & teach-swap reasons)
  const candidates = await dataAccess.getDiscoveryCandidates(alice.id, { subjectSlug: 'dsa' });
  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.length > 0);

  const firstCandidate = candidates[0];
  assert.ok(firstCandidate.matchScore > 0);
  assert.ok(Array.isArray(firstCandidate.reasons));
  assert.ok(firstCandidate.reasons.length > 0);
  assert.ok(Array.isArray(firstCandidate.strengths));
  assert.ok(Array.isArray(firstCandidate.gaps));

  // 3. Send Partner Request
  const req = await dataAccess.sendPartnerRequest(alice.id, {
    receiverId: firstCandidate.id,
    subjectSlug: 'dsa',
    note: 'Hey! Would love to study and teach-swap over Zoom.'
  });
  assert.ok(req);
  assert.equal(req.status, 'pending');

  const partnerRequests = await dataAccess.getPartnerRequests(firstCandidate.id);
  assert.ok(partnerRequests.length > 0);

  // 4. Create Study Group (Zoom meets)
  const group = await dataAccess.createStudyGroup({
    creatorId: alice.id,
    name: 'DSA Final Exam Sprint',
    subjectSlug: 'dsa',
    sizeLimit: 4,
    goal: 'exam_prep'
  });
  assert.equal(group.title, 'DSA Final Exam Sprint');
  assert.ok(group.tool_link.includes('zoom.us'));

  // 5. Available Groups & Member List
  const groups = await dataAccess.getAvailableGroups('dsa');
  assert.ok(Array.isArray(groups));
  assert.ok(groups.length > 0);
  for (const g of groups) {
    assert.equal(g.tool_used, 'zoom');
    assert.ok(g.tool_link.includes('zoom.us'));
  }

  // 6. Group Coordination Hub
  const hub = await dataAccess.getGroupHub(1);
  assert.ok(hub);
  assert.equal(hub.match.tool_used, 'zoom');
  assert.ok(hub.match.tool_link.includes('zoom.us'));
  assert.ok(hub.sessions.length > 0);
  assert.ok(hub.milestones.length > 0);

  // 7. Best Time Slot Recommendation
  const recommendation = await dataAccess.getBestTimeSlot(1);
  assert.ok(recommendation);
  assert.ok(recommendation.day);
  assert.ok(recommendation.timeBlock);

  // 8. Resource Sharing
  const sharedRes = await dataAccess.addGroupResource(1, alice.id, {
    title: 'Top DP Patterns Cheatsheet',
    url: 'https://docs.google.com/document/d/sample',
    note: 'Handy summary of knapsack and LCS variants',
    type: 'document'
  });
  assert.ok(sharedRes);
  assert.equal(sharedRes.title, 'Top DP Patterns Cheatsheet');

  const resourceList = await dataAccess.getGroupResources(1);
  assert.ok(resourceList.length >= 2);

  // 9. 1:1 Direct Chat with Icebreaker
  const partnerId = hub.members.find(m => m.id !== alice.id)?.id || 2;
  const sentMsg = await dataAccess.sendDirectMessage(alice.id, partnerId, {
    content: 'Icebreaker answer: For me it was understanding base cases in recursion!',
    isIcebreaker: true
  });
  assert.ok(sentMsg);
  assert.equal(sentMsg.is_icebreaker, true);

  const directMsgs = await dataAccess.getDirectMessages(alice.id, partnerId);
  assert.ok(directMsgs.length > 0);

  // 10. Post-Session Feedback & Reshuffle Trigger
  const feedbackResult = await dataAccess.submitFeedback({
    sessionId: 1,
    reviewerId: alice.id,
    revieweeId: partnerId,
    productive: true,
    comments: 'Great session!'
  });
  assert.ok(feedbackResult);
  assert.ok(feedbackResult.newReliability > 0);
});
