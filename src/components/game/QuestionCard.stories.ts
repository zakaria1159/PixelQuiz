import type { Meta, StoryObj } from '@storybook/react'
import QuestionCard from './QuestionCard'
import { Question } from '@/types'

const meta = {
  title: 'Game/QuestionCard',
  component: QuestionCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof QuestionCard>

export default meta
type Story = StoryObj<typeof meta>

const sampleQuestion: Question = {
  id: '1',
  type: 'multiple_choice',
  question: 'Which streaming platform is known for its purple branding?',
  options: ['YouTube', 'Twitch', 'TikTok', 'Instagram'],
  correctAnswer: 1,
  timeLimit: 15,
  category: 'streaming',
  difficulty: 'easy',
  explanation: 'Twitch uses purple as its primary brand color and is the leading live streaming platform for gaming.',
}

const trueFalseQuestion: Question = {
  id: '2',
  type: 'true_false',
  question: 'The human brain contains approximately 86 billion neurons',
  options: ['True', 'False'],
  correctAnswer: 0,
  timeLimit: 12,
  category: 'science',
  difficulty: 'hard',
  explanation: 'Recent estimates suggest the human brain contains around 86 billion neurons.',
}

export const Default: Story = {
  args: {
    question: sampleQuestion,
    currentIndex: 0,
    totalQuestions: 10,
    onAnswerSelect: () => console.log('Answer selected'),
  },
}

export const TrueFalse: Story = {
  args: {
    question: trueFalseQuestion,
    currentIndex: 4,
    totalQuestions: 10,
    onAnswerSelect: () => console.log('Answer selected'),
  },
}

export const WithSelectedAnswer: Story = {
  args: {
    question: sampleQuestion,
    currentIndex: 2,
    totalQuestions: 10,
    selectedAnswer: 1,
    onAnswerSelect: () => console.log('Answer selected'),
  },
}

export const ShowingResults: Story = {
  args: {
    question: sampleQuestion,
    currentIndex: 2,
    totalQuestions: 10,
    showAnswers: true,
    selectedAnswer: 0,
    correctAnswer: 1,
  },
}

export const CorrectAnswer: Story = {
  args: {
    question: sampleQuestion,
    currentIndex: 2,
    totalQuestions: 10,
    showAnswers: true,
    selectedAnswer: 1,
    correctAnswer: 1,
  },
}

export const Disabled: Story = {
  args: {
    question: sampleQuestion,
    currentIndex: 2,
    totalQuestions: 10,
    disabled: true,
  },
}
