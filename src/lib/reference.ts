/**
 * Built-in reference books. These are the only source the tutor answers
 * from — there is no ChatGPT or external AI call anywhere in this app.
 * The printable sheets are shipped as real PDFs in public/reference.
 */

export interface ReferenceSection {
  heading: string
  keywords: RegExp
  facts: string[]
  hint: string
  practice: string[]
}

export interface ReferenceBook {
  subject: string
  title: string
  file: string
  summary: string
  sections: ReferenceSection[]
}

export const REFERENCE_BOOKS: ReferenceBook[] = [
  {
    subject: 'Mathematics',
    title: 'Mathematics reference book',
    file: `${import.meta.env.BASE_URL}reference/mathematics-formula-sheet.pdf`,
    summary: 'Quadratic formula, identities, trigonometry and mensuration, on one page.',
    sections: [
      {
        heading: 'Quadratic equations',
        keywords: /quadratic|discriminant|factor|roots?|equation|x\s*[²^]|parabola/i,
        facts: [
          'Write the equation in standard form: ax² + bx + c = 0, with a not equal to 0.',
          'The quadratic formula is x = (−b ± √(b² − 4ac)) / 2a.',
          'The discriminant D = b² − 4ac tells you the roots: D > 0 two real roots, D = 0 one repeated root, D < 0 no real roots.',
          'Sum of roots = −b/a; product of roots = c/a.',
        ],
        hint: 'Work out the discriminant first. If it is a perfect square, factorising will probably work.',
        practice: [
          'Solve x² + 5x + 6 = 0 by factorising, then check with the formula.',
          'Use the discriminant to say how many real roots 2x² − 3x + 5 = 0 has.',
        ],
      },
      {
        heading: 'Trigonometry',
        keywords: /trig|sin|cos|tan|angle|triangle|height|distance/i,
        facts: [
          'In a right triangle: sin = opposite ÷ hypotenuse, cos = adjacent ÷ hypotenuse, tan = opposite ÷ adjacent.',
          'The identity sin²x + cos²x = 1 holds for every angle x.',
          'tan x = sin x ÷ cos x.',
        ],
        hint: 'Label the opposite, adjacent and hypotenuse before choosing a ratio.',
        practice: [
          'Find the height of a tree that casts a 12 m shadow when the sun is at 35°.',
          'Show that sin²30° + cos²30° = 1.',
        ],
      },
      {
        heading: 'Mensuration',
        keywords: /area|volume|surface|circle|cylinder|sphere|perimeter/i,
        facts: [
          'Circle: area = πr² and circumference = 2πr.',
          'Cylinder: volume = πr²h and curved surface = 2πrh.',
          'Sphere: volume = 4/3 πr³ and surface = 4πr².',
        ],
        hint: 'Write the formula with its units before substituting any numbers.',
        practice: [
          'Find the volume of a cylinder with r = 7 cm and h = 10 cm.',
          'A sphere has volume 36π cm³. What is its radius?',
        ],
      },
    ],
  },
  {
    subject: 'Science',
    title: 'Science reference book',
    file: `${import.meta.env.BASE_URL}reference/science-lab-report-guide.pdf`,
    summary: 'The six sections of a lab report, plus photosynthesis and variables.',
    sections: [
      {
        heading: 'Writing a lab report',
        keywords: /lab|report|experiment|method|conclusion|aim|results|variable|apparatus/i,
        facts: [
          'State the aim and the variables: independent, dependent and two controlled variables.',
          'Record raw readings in a table with units; plot averages with a title, labelled axes and units.',
          'The analysis describes the trend and explains the science behind it; the conclusion answers the aim directly.',
          'Give at least two realistic sources of error and say how each would affect the result.',
        ],
        hint: 'Another student should be able to repeat your experiment from the method alone.',
        practice: [
          'Write the aim and three variables for an experiment on light intensity and photosynthesis.',
          'Name two sources of error in a leaf-disc experiment.',
        ],
      },
      {
        heading: 'Photosynthesis',
        keywords: /photosynthesis|plant|chlorophyll|leaf|glucose|oxygen/i,
        facts: [
          'Word equation: carbon dioxide + water → glucose + oxygen, using light energy.',
          'It happens in the chloroplasts, using the pigment chlorophyll.',
          'The light-dependent reactions split water and release oxygen; the Calvin cycle builds glucose.',
          'Light intensity, CO₂ concentration and temperature all affect the rate, and each can become limiting.',
        ],
        hint: 'Draw the leaf cross-section and label where each stage happens before you write.',
        practice: [
          'Explain why a plant kept in the dark loses mass over time.',
          'Predict the effect on the rate if CO₂ is doubled, then doubled again.',
        ],
      },
    ],
  },
  {
    subject: 'English',
    title: 'English reference book',
    file: `${import.meta.env.BASE_URL}reference/english-essay-structure.pdf`,
    summary: 'Essay structure, point–evidence–explain paragraphs and quoting well.',
    sections: [
      {
        heading: 'Essay structure',
        keywords: /essay|paragraph|introduction|conclusion|thesis|argument|write/i,
        facts: [
          'The introduction hooks the reader and states the thesis in one sentence.',
          'Each body paragraph follows point, evidence, explain, link.',
          'The conclusion restates the thesis in new words and does not introduce new evidence.',
          'Keep quotations short and analyse the effect of individual words.',
        ],
        hint: 'If a paragraph has no evidence, it is an opinion, not an argument — find one example for it.',
        practice: [
          'Write a thesis sentence for your topic in under 25 words.',
          'Draft one point–evidence–explain paragraph.',
        ],
      },
      {
        heading: 'Analysis and quoting',
        keywords: /quote|quotation|language|analysis|metaphor|evidence|character/i,
        facts: [
          'Introduce a quotation with a comma and keep it as short as possible.',
          'Analyse single words for their connotations, not the whole plot.',
          'Link every quotation back to the thesis of the essay.',
        ],
        hint: 'Ask what the exact word suggests to the reader, then explain why the writer chose it.',
        practice: [
          'Choose one short quotation and write two sentences on one word in it.',
          'Explain the difference between retelling and analysing.',
        ],
      },
    ],
  },
  {
    subject: 'History',
    title: 'History reference book',
    file: `${import.meta.env.BASE_URL}reference/history-source-questions.pdf`,
    summary: 'Cause, evidence, source reliability and significance for history answers.',
    sections: [
      {
        heading: 'Answering a history question',
        keywords: /history|revolt|war|independence|empire|cause|revolution|source/i,
        facts: [
          'Anchor every claim to a date and a place; a date without an explanation is just a fact.',
          'Separate long-term causes, the short-term trigger and the consequences.',
          'Support the answer with at least two specific pieces of evidence: a person, a policy, an event or a statistic.',
          'Say who made each source, when and why — that shapes how reliable it is.',
        ],
        hint: 'Always add “this mattered because…” after a date or event.',
        practice: [
          'List three long-term causes and one trigger for your topic.',
          'Write two sentences on the consequences for ordinary people, not just rulers.',
        ],
      },
    ],
  },
  {
    subject: 'Computer Science',
    title: 'Python reference book',
    file: `${import.meta.env.BASE_URL}reference/computer-science-python-cheatsheet.pdf`,
    summary: 'Input, loops, lists, dictionaries, functions and common errors.',
    sections: [
      {
        heading: 'Loops',
        keywords: /loop|for|while|range|iterate|pattern|table/i,
        facts: [
          'for i in range(1, 11) repeats exactly ten times — range stops before the second number.',
          'A while loop repeats until its condition becomes false, so the condition must change inside the loop.',
          'Collect results in a list or by printing inside the loop, not after it.',
        ],
        hint: 'Trace the first two and last two iterations on paper before running the code.',
        practice: [
          'Print the multiplication table of 7 using a for loop.',
          'Write a while loop that prints 10 down to 1.',
        ],
      },
      {
        heading: 'Lists and dictionaries',
        keywords: /list|array|dict|dictionary|append|index|marks/i,
        facts: [
          'Lists keep order: marks[0] is the first item, and marks.append(x) adds to the end.',
          'len(marks) gives the number of items and sum(marks) adds them.',
          'Dictionaries map keys to values: student["name"] reads the value for that key.',
        ],
        hint: 'Check whether an index starts at 0 or 1 before you trust an off-by-one answer.',
        practice: [
          'Make a list of three marks and print their average.',
          'Store a student name and grade in a dictionary and print both.',
        ],
      },
      {
        heading: 'Functions',
        keywords: /function|def|return|parameter|argument/i,
        facts: [
          'Define a function with def name(parameters): and return the result with return.',
          'A function without return gives back None.',
          'Test a function with a normal value, a boundary value and an empty value.',
        ],
        hint: 'Write the function call you want first, then make the definition match it.',
        practice: [
          'Write average(a, b) that returns the mean of two numbers.',
          'Write sum_list(numbers) and test it with an empty list.',
        ],
      },
      {
        heading: 'Common Python errors',
        keywords: /error|debug|bug|indentation|nameerror|typeerror|exception/i,
        facts: [
          'IndentationError means the spaces at the start of a block are inconsistent.',
          'NameError means a variable is used before it is defined on that path.',
          'TypeError often means input() text is being used in maths without int() or float().',
        ],
        hint: 'Read the last line of the traceback first — it names the error type and line.',
        practice: [
          'Fix: age = input("Age: ") then print(age + 1).',
          'Reproduce one bug with the smallest possible input.',
        ],
      },
    ],
  },
]

function bookForSubject(subject: string): ReferenceBook | undefined {
  const s = subject.trim().toLowerCase()
  if (!s) return undefined
  return REFERENCE_BOOKS.find((b) => b.subject.toLowerCase() === s)
    ?? REFERENCE_BOOKS.find((b) => s.includes(b.subject.toLowerCase()) || b.subject.toLowerCase().includes(s))
}

/** Pick the best matching reference section for a subject + question. */
export function findReferenceSection(subject: string, question: string): { book: ReferenceBook; section: ReferenceSection } | null {
  const preferred = bookForSubject(subject)
  const books = preferred ? [preferred, ...REFERENCE_BOOKS.filter((b) => b !== preferred)] : REFERENCE_BOOKS
  for (const book of books) {
    const section = book.sections.find((s) => s.keywords.test(question))
    if (section) return { book, section }
  }
  return null
}
