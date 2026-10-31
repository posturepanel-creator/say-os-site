export const questions = [
  {
    id: 'before-arrival', topic: 'Timing', title: 'When do you collect a client’s consultation details?',
    note: 'Think about your usual advanced-skin appointments.',
    options: ['Before the appointment', 'Before some appointments', 'On arrival / not yet'],
    action: 'Move the consultation earlier',
    detail: 'Ask for treatment-relevant details before the appointment, with enough time for a practitioner to review them.',
    passport: 'A shared Beauty Passport can give the practitioner an earlier starting point.',
  },
  {
    id: 'changes', topic: 'Keeping records current', title: 'Do returning clients confirm what has changed?',
    note: 'A familiar client can have a new health, medication or skincare update.',
    options: ['At every appointment', 'Sometimes, if it comes up', 'We rely on their old form / unsure'],
    action: 'Add a “what’s changed?” check',
    detail: 'Ask every returning client to confirm changes, then date the update. Reconfirm relevant details on the treatment day.',
    passport: 'Use the Beauty Passport as an updateable record, rather than a one-off form.',
  },
  {
    id: 'medicines', topic: 'Medicines & skincare', title: 'Do you ask about medicines and active skincare before they arrive?',
    note: 'Include recent changes and relevant supplements; the practitioner interprets the information.',
    options: ['Yes, as a routine step', 'Sometimes / only for certain treatments', 'Only on arrival / unsure'],
    action: 'Prompt for medicines and active skincare',
    detail: 'Add a specific prompt for relevant medicines, active skincare and recent changes. Review against the intended treatment’s guidance.',
    passport: 'The Beauty Passport helps the client share information that could otherwise be missed.',
  },
  {
    id: 'reactions', topic: 'Allergies & reactions', title: 'Are allergies and previous reactions visible before treatment day?',
    note: 'Include product reactions and previous treatment reactions, not just known allergies.',
    options: ['Yes, collected and reviewed', 'Collected, but review varies', 'Not routinely / unsure'],
    action: 'Make reaction history visible',
    detail: 'Collect known allergies and previous product or treatment reactions, and make them easy for the treating practitioner to review.',
    passport: 'The Beauty Passport brings reaction history into the client’s shared record.',
  },
  {
    id: 'elsewhere', topic: 'The bigger picture', title: 'Do you ask about recent treatments at other providers?',
    note: 'For example, peels, laser, microneedling or injectables, including when and where.',
    options: ['Yes, every time', 'Only when a client mentions them', 'Not routinely / unsure'],
    action: 'Ask what happened elsewhere',
    detail: 'Ask about relevant recent treatments and dates across providers. Check any timing or interaction concern against treatment guidance.',
    passport: 'The Beauty Passport supports a client-held history across providers.',
  },
  {
    id: 'review', topic: 'Practitioner review', title: 'Does someone review possible contraindications before the visit?',
    note: 'Collecting a form is only useful if someone acts on the information.',
    options: ['Yes, with a clear review process', 'Sometimes / depends who is working', 'We usually review on arrival / unsure'],
    action: 'Give the review a clear owner',
    detail: 'Name who reviews the consultation and what triggers a follow-up, postponement or referral. Confirm suitability on the day using professional judgement.',
    passport: 'A shared Beauty Passport supports the review; it does not make the treatment decision.',
  },
  {
    id: 'evidence', topic: 'A record you can find', title: 'Can the treating practitioner quickly find the record and decision?',
    note: 'Include the current consultation, relevant test records and the reason for the decision.',
    options: ['Yes, together and easy to retrieve', 'Yes, but spread across places', 'Not consistently / unsure'],
    action: 'Keep the decision with the record',
    detail: 'Keep a dated consultation, relevant test evidence and the practitioner’s decision together, with access limited to people who need it.',
    passport: 'The Beauty Passport supports portable information; the provider still keeps the treatment record it needs.',
  },
] as const;

export type Answers = (number | null)[];
export function isComplete(answers: unknown): answers is number[] {
  return Array.isArray(answers) && answers.length === questions.length && answers.every(a => Number.isInteger(a) && a >= 0 && a <= 2);
}
export function getResult(answers: number[]) {
  if (!isComplete(answers)) throw new Error('Complete all seven questions first.');
  const established = answers.filter(a => a === 2).length;
  const inconsistent = answers.filter(a => a === 1).length;
  const gaps = answers.filter(a => a === 0).length;
  const total = answers.reduce((a,b) => a+b,0);
  const title = answers[5] === 0 ? 'Give the review a clear owner' : total >= 12 ? 'Strong process foundations' : total >= 7 ? 'Make your process more consistent' : 'Build your pre-arrival picture';
  const summary = total === 14 ? 'Your answers describe a consistent process across all seven areas. Keep records current and confirm relevant changes on treatment day.' : 'Your answers show where an earlier, more consistent consultation could help. Start with the priorities below.';
  const priorities = questions.map((q,i) => ({...q, value:answers[i], index:i})).filter(q => q.value < 2).sort((a,b) => a.value-b.value || (a.index === 5 ? -1 : b.index === 5 ? 1 : a.index-b.index)).slice(0,3);
  return {title, summary, established, inconsistent, gaps, priorities};
}

export const CONSENT_VERSION = 'show-followup-v1';
export const CONSENT_TEXT = 'I’d like SAY to contact me about my result and the Beauty Passport.';
