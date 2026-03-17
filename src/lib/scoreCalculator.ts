import { Question, hasOptions, requiresTextInput, requiresRanking, isClosestWinsQuestion, isLetterGameQuestion } from '@/types'

export const getAnswerDisplayText = (question: Question, answer: string | number): string => {
  if (hasOptions(question)) {
    if (typeof answer === 'number' && question.options[answer]) {
      return question.options[answer]
    }
    return 'Invalid option'
  } else if (requiresTextInput(question)) {
    return typeof answer === 'string' ? answer : 'Invalid answer'
  } else if (requiresRanking(question)) {
    if (typeof answer === 'string') {
      try {
        const order = answer.split(',').map(num => parseInt(num.trim()))
        return order.map(index => question.items[index]).join(' → ')
      } catch {
        return 'Invalid ranking'
      }
    }
    return 'Invalid ranking'
  } else if (isClosestWinsQuestion(question)) {
    const unit = question.unit ? ` ${question.unit}` : ''
    return `${answer}${unit}`
  } else if (isLetterGameQuestion(question)) {
    const entries = answer.toString().split(',')
    return question.categories
      .map((cat, i) => `${cat}: ${entries[i]?.trim() || '—'}`)
      .join(' | ')
  }
  return 'Unknown answer'
}
