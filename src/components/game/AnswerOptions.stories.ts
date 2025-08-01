import type { Meta, StoryObj } from '@storybook/react'
import AnswerOptions from './AnswerOptions'

const meta = {
  title: 'Game/AnswerOptions',
  component: AnswerOptions,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AnswerOptions>

export default meta
type Story = StoryObj<typeof meta>

const sampleOptions = ['YouTube', 'Twitch', 'TikTok', 'Instagram']
const trueFalseOptions = ['True', 'False']

export const Default: Story = {
  args: {
    options: sampleOptions,
    onAnswerSelect: () => console.log('Answer selected'),
  },
}

export const TrueFalse: Story = {
  args: {
    options: trueFalseOptions,
    onAnswerSelect: () => console.log('Answer selected'),
  },
}

export const WithSelection: Story = {
  args: {
    options: sampleOptions,
    selectedAnswer: 1,
    onAnswerSelect: () => console.log('Answer selected'),
  },
}

export const ShowingResults: Story = {
  args: {
    options: sampleOptions,
    selectedAnswer: 0,
    correctAnswer: 1,
    showResults: true,
  },
}

export const CorrectAnswer: Story = {
  args: {
    options: sampleOptions,
    selectedAnswer: 1,
    correctAnswer: 1,
    showResults: true,
  },
}

export const Disabled: Story = {
  args: {
    options: sampleOptions,
    disabled: true,
  },
}

export const TimeUp: Story = {
  args: {
    options: sampleOptions,
    timeLeft: 0,
    onAnswerSelect: () => console.log('Answer selected'),
  },
}