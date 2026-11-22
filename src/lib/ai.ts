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

export type TutorLevel = 'hint' | 'explain' | 'practice'

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

export function generateTutorReply(question: string, assignmentTitle = '', subject = '', level: TutorLevel = 'hint'): TutorReply {
  const hay = `${question} ${assignmentTitle}`.trim()
  const reference = findReferenceSection(subject, hay)
  if (reference) {
    const { book, section } = reference
    const note = `Source: ${book.title}.`
    if (level === 'explain') {
      return {
        heading: `${book.title}: ${section.heading} — explained`,
        steps: [
          ...section.facts,
          'Read each line back and say which one applies to your question before writing anything.',
        ],
        hint: section.hint,
        practice: section.practice,
        note,
      }
    }
    if (level === 'practice') {
      return {
        heading: `${book.title}: practice ${section.heading.toLowerCase()}`,
        steps: section.practice.map((p, i) => `Practice ${i + 1}: ${p}`),
        hint: 'Try both problems before checking your working against the reference.',
        practice: section.practice,
        note,
      }
    }
    return {
      heading: `${book.title}: ${section.heading}`,
      steps: [
        section.facts[0],
        section.facts[1] ?? section.facts[0],
        `Before I say more: describe in your own words which part of ${section.heading.toLowerCase()} is unclear.`,
      ],
      hint: section.hint,
      practice: [section.practice[0]],
      note,
    }
  }
  return {
    ...FALLBACK,
    note: 'No matching reference page was found. Try a more specific question.',
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
