import type { Meta, StoryObj } from '@storybook/react'
import Leaderboard from './LeaderBoard'
import { Player } from '@/types'

const meta = {
  title: 'Game/Leaderboard',
  component: Leaderboard,
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
} satisfies Meta<typeof Leaderboard>

export default meta
type Story = StoryObj<typeof meta>

const samplePlayers: Player[] = [
  {
    id: '1',
    name: 'StreamerPro',
    score: 4200,
    isHost: true,
    connected: true,
    avatar: '👑',
    joinedAt: Date.now() - 10000,
  },
  {
    id: '2',
    name: 'QuizMaster',
    score: 3850,
    isHost: false,
    connected: true,
    avatar: '🧠',
    joinedAt: Date.now() - 8000,
  },
  {
    id: '3',
    name: 'GamerGirl',
    score: 3600,
    isHost: false,
    connected: true,
    avatar: '🎮',
    joinedAt: Date.now() - 6000,
  },
  {
    id: '4',
    name: 'TriviaNinja',
    score: 3200,
    isHost: false,
    connected: true,
    avatar: '🥷',
    joinedAt: Date.now() - 4000,
  },
  {
    id: '5',
    name: 'ChillPlayer',
    score: 2900,
    isHost: false,
    connected: false,
    avatar: '😎',
    joinedAt: Date.now() - 2000,
  },
]

export const Default: Story = {
  args: {
    players: samplePlayers,
  },
}

export const Top3Only: Story = {
  args: {
    players: samplePlayers,
    title: 'Top 3 Players',
    maxPlayers: 3,
  },
}

export const Compact: Story = {
  args: {
    players: samplePlayers,
    variant: 'compact',
    title: 'Current Standings',
  },
}

export const NoRanks: Story = {
  args: {
    players: samplePlayers.slice(0, 3),
    title: 'Connected Players',
    showRanks: false,
  },
}

export const SinglePlayer: Story = {
  args: {
    players: [samplePlayers[0]],
    title: 'Waiting for Players...',
  },
}