/**
 * Reference-book tutor — deterministic answers taken from the built-in
 * reference books in ./reference. There is no ChatGPT, no external AI
 * provider and no network call: the facts in each reply come straight from
 * the same reference sheets students can download on the Assessment tab.
 * It gives guidance and asks the student to apply it — it never writes the
 * student's final answer.
 */
import { findReferenceSection } from './reference'

export interface TutorReply {
  heading: string
  steps: string[]
  hint: string
  practice: string[]
  note: string
}

const FALLBACK: Omit<TutorReply, 'note'> = {
  heading: 'Let’s work through it together',
  steps: [
    'Tell me, in your own words, what the question is asking. What is the goal?',
    'What do you already know that relates to it? List the facts, formulas or ideas you are sure about.',
    'Check your subject’s reference book on the Assessment tab for the matching formula or method.',
    'Break the problem into the smallest first step you can do confidently, and do just that step.',
    'If you get stuck, describe exactly where: what did you try, and what happened?',
  ],
  hint: 'A good first move is restating the question in your own words — misunderstandings usually hide there.',
  practice: [
    'Write the question in your own words.',
    'List three things you already know about this topic.',
  ],
}

export function generateTutorReply(question: string, assignmentTitle = '', subject = ''): TutorReply {
  const hay = `${question} ${assignmentTitle}`.trim()
  const reference = findReferenceSection(subject, hay)
  if (reference) {
    return {
      heading: `${reference.book.title}: ${reference.section.heading}`,
      steps: [
        ...reference.section.facts,
        'Now apply the reference to your own question and write the first line of working.',
      ],
      hint: reference.section.hint,
      practice: reference.section.practice,
      note: `Taken from the built-in ${reference.book.title}, not from ChatGPT or any external AI. The tutor guides you; your work stays your own.`,
    }
  }
  return {
    ...FALLBACK,
    note: 'No reference page matched this question, so these are general study steps. Answers come only from the built-in reference books — never ChatGPT or an external AI.',
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
