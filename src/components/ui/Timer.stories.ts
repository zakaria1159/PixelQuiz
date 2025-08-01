import type { Meta, StoryObj } from '@storybook/react'
import Timer from './Timer'

const meta = {
  title: 'UI/Timer',
  component: Timer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['circular', 'linear'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
  args: { onTimeUp: () => console.log('Time up!') },
} satisfies Meta<typeof Timer>

export default meta
type Story = StoryObj<typeof meta>

export const CircularDefault: Story = {
  args: {
    timeLeft: 15,
    totalTime: 30,
    variant: 'circular',
    size: 'md',
  },
}

export const CircularWarning: Story = {
  args: {
    timeLeft: 5,
    totalTime: 30,
    variant: 'circular',
    size: 'md',
  },
}

export const CircularCritical: Story = {
  args: {
    timeLeft: 2,
    totalTime: 30,
    variant: 'circular',
    size: 'md',
  },
}

export const LinearDefault: Story = {
  args: {
    timeLeft: 20,
    totalTime: 30,
    variant: 'linear',
  },
}

export const LinearWarning: Story = {
  args: {
    timeLeft: 4,
    totalTime: 15,
    variant: 'linear',
  },
}

export const Large: Story = {
  args: {
    timeLeft: 25,
    totalTime: 30,
    variant: 'circular',
    size: 'lg',
  },
}

export const Small: Story = {
  args: {
    timeLeft: 10,
    totalTime: 15,
    variant: 'circular',
    size: 'sm',
  },
}