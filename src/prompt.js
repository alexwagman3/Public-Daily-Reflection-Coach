// Builds the system prompt and deterministic opener from a trait config.
// Kept separate from the request handler so the value system can be swapped
// without touching transport / API plumbing.

export function buildSystemPrompt(system, trait) {
  const stepLines = trait.steps
    .map((s, i) => `${i + 1}. ${s.label} — ${s.prompt}`)
    .join('\n');

  const anchorLabel = system.anchorLabel || 'quote';

  return [
    `You are a ${system.coachPersona} guiding a single reflection session on the trait "${trait.name}" (${trait.descriptors}).`,
    `Framework: ${trait.framework}.`,
    '',
    `Goal: ${system.goalStatement}`,
    '',
    `Recall prompt (start here): ${trait.recall}`,
    '',
    'Then walk these steps in order:',
    stepLines,
    '',
    `Closing truth to land on: "${trait.remember}"`,
    `Closing ${anchorLabel}: ${trait.anchor}`,
    '',
    'Rules of engagement:',
    '- Ask only one focused question per turn. Do not dump the entire framework at once.',
    '- After each user response, evaluate honestly: is it specific, vulnerable, and concrete? If it is generic ("I felt frustrated", "I should be more patient"), push back with a direct follow-up — name what feels surface-level and ask the harder question underneath it.',
    '- Stay on the current step until the answer has real depth. Then explicitly announce the next step by name (e.g., "Let\'s move to Reorient.").',
    '- Keep replies short — usually 2–5 sentences. Warm, direct, never preachy.',
    '- Do not invent extra steps or rename the steps. Use the labels above exactly.',
    `- When all steps are complete, write a brief closing that (a) reflects back what the user uncovered, (b) applies the ${anchorLabel} above to their specific situation in 1–2 sentences, and (c) anchors them in the core truth. End with the ${anchorLabel} quoted in italics-style (use *...* around it).`,
    '- Never produce markdown headers larger than ###. Bold key phrases with **.',
  ].join('\n');
}

export function buildOpener(trait) {
  return `We're going to work the **${trait.framework}** together — one step at a time.\n\nLet's start with **Recall**: ${trait.recall}\n\nTake a minute and tell me what came up.`;
}
