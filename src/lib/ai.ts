/**
 * Demo AI tutor — deterministic, guided hints.
 * This is NOT a live AI provider call. When no provider is configured,
 * the tutor gives step-by-step Socratic hints derived from
 * the assignment context and the student's question, and says so clearly.
 * With a provider configured, the Edge Function /api/ai-tutor path is used
 * instead (see docs/AI_SETUP.md). It never writes the student's answer.
 */

export interface TutorReply {
  heading: string
  steps: string[]
  hint: string
  practice: string[]
  note: string
}

const BANK: { match: RegExp; reply: Omit<TutorReply, 'note'> }[] = [
  {
    match: /quadratic|solve.*x|factor|equation/i,
    reply: {
      heading: 'Solving a quadratic, step by step',
      steps: [
        'First, write the equation in standard form: ax² + bx + c = 0. What are a, b and c in your question?',
        'Check whether it factorises: look for two numbers that multiply to a×c and add to b.',
        'If it does not factorise neatly, use the quadratic formula: x = (−b ± √(b² − 4ac)) / 2a.',
        'Work out the discriminant (b² − 4ac) first — it tells you how many real roots to expect.',
        'Substitute carefully, then check each root by putting it back into the original equation.',
      ],
      hint: 'Try the discriminant first. If it is a perfect square, factorising will probably work.',
      practice: [
        'Solve x² + 5x + 6 = 0 by factorising.',
        'Use the formula for 2x² − 3x − 2 = 0 and check both answers.',
      ],
    },
  },
  {
    match: /photosynthesis|plant|chlorophyll/i,
    reply: {
      heading: 'Photosynthesis — the big picture first',
      steps: [
        'Start with the word equation: carbon dioxide + water → glucose + oxygen (using light energy).',
        'Where does it happen? In the chloroplasts, in the pigment chlorophyll.',
        'Light-dependent reactions split water and release oxygen; the light-independent reactions (Calvin cycle) build glucose.',
        'Link each factor — light intensity, CO₂ concentration, temperature — to the rate, and say why the rate plateaus.',
        'Finish by explaining why the plant needs glucose: respiration, growth, storage as starch.',
      ],
      hint: 'Draw the leaf cross-section and label where each stage happens before you write.',
      practice: [
        'Explain why a plant kept in the dark loses mass over time.',
        'Predict what happens to the rate if CO₂ is doubled, then doubled again.',
      ],
    },
  },
  {
    match: /essay|write|paragraph|introduction|conclusion/i,
    reply: {
      heading: 'Structuring your writing',
      steps: [
        'Write your main argument in one sentence first — that becomes your thesis.',
        'Plan three points that support it, one per paragraph, each with one piece of evidence.',
        'Open each paragraph with a topic sentence, then evidence, then explain how it supports your thesis.',
        'Link paragraphs with a connecting phrase so the reader follows your reasoning.',
        'Conclude by restating the argument in new words — do not introduce new evidence here.',
      ],
      hint: 'If a paragraph has no evidence, it is an opinion, not an argument — find one example for it.',
      practice: [
        'Write a thesis sentence for your topic in under 25 words.',
        'Draft one paragraph using the point–evidence–explain pattern.',
      ],
    },
  },
  {
    match: /python|code|error|debug|function|loop|program/i,
    reply: {
      heading: 'Debugging, methodically',
      steps: [
        'Read the error message fully — the last line names the error type, and the traceback names the line.',
        'Reproduce the error with the smallest possible input before changing anything.',
        'Check the usual suspects first: indentation, brackets, variable names, and off-by-one loop bounds.',
        'Add a print() of the variable just before the failing line to see its actual value.',
        'Fix one thing at a time, re-run, and keep a note of what you changed.',
      ],
      hint: 'If the error says NameError, the variable was never assigned on the path your code actually took.',
      practice: [
        'Write a function that returns the sum of a list, then test it with an empty list.',
        'Find the bug: for i in range(5): print(i) prints 0–4, not 1–5. Why?',
      ],
    },
  },
  {
    match: /history|revolt|war|independence|empire/i,
    reply: {
      heading: 'Answering a history question well',
      steps: [
        'Start with when and where — anchor every claim to a date or place.',
        'Separate causes (long-term), trigger (short-term), and consequences.',
        'Use at least two pieces of specific evidence: a person, a policy, an event, a statistic.',
        'Show both sides where historians disagree, and say which view the evidence supports better.',
        'End with significance: what changed as a result, and for whom?',
      ],
      hint: 'A date without an explanation is just a fact — always add “this mattered because…”.',
      practice: [
        'List three long-term causes and one trigger for your topic.',
        'Write two sentences on the consequences for ordinary people, not just rulers.',
      ],
    },
  },
]

const FALLBACK: Omit<TutorReply, 'note'> = {
  heading: 'Let’s work through it together',
  steps: [
    'Tell me, in your own words, what the question is asking. What is the goal?',
    'What do you already know that relates to it? List the facts, formulas or ideas you are sure about.',
    'Break the problem into the smallest first step you can do confidently, and do just that step.',
    'Check your result for that step before moving on — does it make sense?',
    'If you get stuck, describe exactly where: what did you try, and what happened?',
  ],
  hint: 'A good first move is restating the question in your own words — misunderstandings usually hide there.',
  practice: [
    'Write the question in your own words.',
    'List three things you already know about this topic.',
  ],
}

export function generateTutorReply(question: string, assignmentTitle = '', subject = ''): TutorReply {
  const hay = `${question} ${assignmentTitle} ${subject}`
  const hit = BANK.find((b) => b.match.test(hay))
  const base = hit ? hit.reply : FALLBACK
  return {
    ...base,
    note: 'Demo hints — no AI provider is configured. These are guided steps, not a completed answer; your work stays your own.',
  }
}

export function generateQuiz(subject: string, topic: string): string[] {
  const t = topic || subject || 'this topic'
  return [
    `In one sentence, what is the key idea behind ${t}?`,
    `Give one example where ${t} is used in real life.`,
    `What is a common mistake students make with ${t}, and how would you avoid it?`,
  ]
}

export const SUGGESTED_PROMPTS = [
  'Explain this in simple language',
  'Give me a hint, not the answer',
  'Walk me through the first step',
  'Quiz me on this topic',
  'How do I check my answer?',
]
