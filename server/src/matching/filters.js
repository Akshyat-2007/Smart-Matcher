/**
 * Pure Hard Filter Module
 * Pair is rejected (returns false) if ANY condition fails:
 * 1. Same subject / course
 * 2. At least one shared availability slot
 * 3. At least one shared communication tool (Exclusively Zoom Meets)
 */

export function passesHardFilters(studentA, studentB) {
  if (!studentA || !studentB || studentA.id === studentB.id) {
    return false;
  }

  // 1. Same Subject / Course filter
  const subjectA = studentA.subjectSlug || studentA.subject_id || studentA.subjectId || studentA.courseCode || studentA.course_id || studentA.courseId;
  const subjectB = studentB.subjectSlug || studentB.subject_id || studentB.subjectId || studentB.courseCode || studentB.course_id || studentB.courseId;

  let hasSubjectMatch = false;
  if (Array.isArray(studentA.subjects) && Array.isArray(studentB.subjects)) {
    hasSubjectMatch = studentA.subjects.some(s => studentB.subjects.includes(s));
  } else if (subjectA && subjectB && subjectA === subjectB) {
    hasSubjectMatch = true;
  }

  if (!hasSubjectMatch) {
    return false;
  }

  // 2. Shared Availability Slot filter
  const slotsA = studentA.slots || studentA.availability_slots || [];
  const slotsB = studentB.slots || studentB.availability_slots || [];
  const setA = new Set(slotsA.map(s => `${s.day ?? s.day_of_week}_${s.slot ?? s.slot_index}`));
  const hasSharedSlot = slotsB.some(s => setA.has(`${s.day ?? s.day_of_week}_${s.slot ?? s.slot_index}`));
  if (!hasSharedSlot) {
    return false;
  }

  // 3. Shared Communication Tool filter (Zoom Meets)
  const rawToolsA = studentA.tools || (studentA.tool_preferences ? studentA.tool_preferences.map(t => t.tool) : []);
  const rawToolsB = studentB.tools || (studentB.tool_preferences ? studentB.tool_preferences.map(t => t.tool) : []);
  const toolsA = rawToolsA.length > 0 ? rawToolsA : ['zoom'];
  const toolsB = rawToolsB.length > 0 ? rawToolsB : ['zoom'];
  const toolSetA = new Set(toolsA.map(t => (typeof t === 'string' ? t.toLowerCase() : t.tool?.toLowerCase())));
  const hasSharedTool = toolsB.some(t => toolSetA.has(typeof t === 'string' ? t.toLowerCase() : t.tool?.toLowerCase()));
  if (!hasSharedTool) {
    return false;
  }

  return true;
}

export function getSharedSlots(studentA, studentB) {
  const slotsA = studentA.slots || studentA.availability_slots || [];
  const slotsB = studentB.slots || studentB.availability_slots || [];
  const setA = new Set(slotsA.map(s => `${s.day ?? s.day_of_week}_${s.slot ?? s.slot_index}`));
  return slotsB.filter(s => setA.has(`${s.day ?? s.day_of_week}_${s.slot ?? s.slot_index}`));
}

export function getSharedTools(studentA, studentB) {
  const toolsA = (studentA.tools?.length > 0 ? studentA.tools : ['zoom']).map(t => typeof t === 'string' ? t.toLowerCase() : t.tool?.toLowerCase());
  const toolsB = (studentB.tools?.length > 0 ? studentB.tools : ['zoom']).map(t => typeof t === 'string' ? t.toLowerCase() : t.tool?.toLowerCase());
  const setA = new Set(toolsA);
  const shared = toolsB.filter(t => setA.has(t));
  return shared.length > 0 ? shared : ['zoom'];
}
