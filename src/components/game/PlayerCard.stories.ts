import type { Meta, StoryObj } from '@storybook/react'
import PlayerCard from './PlayerCard'
import { Player } from '@/types'

const meta = {
  title: 'Game/PlayerCard',
  component: PlayerCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'compact', 'detailed'],
    },
  },
} satisfies Meta<typeof PlayerCard>

export default meta
type Story = StoryObj<typeof meta>

const samplePlayer: Player = {
  id: '1',
  name: 'Alex',
  score: 2850,
  isHost: false,
  connected: true,
  avatar: '🐱',
  joinedAt: Date.now(),
}

const hostPlayer: Player = {
  ...samplePlayer,
  name: 'StreamerPro',
  isHost: true,
  avatar: '👑',
  score: 4200,
}

const disconnectedPlayer: Player = {
  ...samplePlayer,
  name: 'OfflineUser',
  connected: false,
  avatar: '🦊',
  score: 1500,
}

export const Default: Story = {
  args: {
    player: samplePlayer,
  },
}

export const WithRank: Story = {
  args: {
    player: samplePlayer,
    rank: 1,
  },
}

export const Host: Story = {
  args: {
    player: hostPlayer,
    rank: 1,
  },
}

export const Disconnected: Story = {
  args: {
    player: disconnectedPlayer,
    rank: 5,
  },
}

export const Compact: Story = {
  args: {
    player: samplePlayer,
    variant: 'compact',
    showScore: false,
  },
}

export const Detailed: Story = {
  args: {
    player: hostPlayer,
    variant: 'detailed',
    rank: 1,
  },
}

export const WithRemove: Story = {
  args: {
    player: samplePlayer,
    onRemove: () => console.log('Remove player'),
  },
}