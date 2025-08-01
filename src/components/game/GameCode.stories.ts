import type { Meta, StoryObj } from '@storybook/react'
import GameCode from './GameCode'

const meta = {
  title: 'Game/GameCode',
  component: GameCode,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof GameCode>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    code: 'ABC123',
  },
}

export const Small: Story = {
  args: {
    code: 'XYZ789',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    code: 'QUIZ42',
    size: 'lg',
  },
}