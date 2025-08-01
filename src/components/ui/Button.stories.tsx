// src/components/ui/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react'
import { Gamepad2, Users, Zap } from 'lucide-react'
import Button from './Button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'pixel-dark',
      values: [
        { name: 'pixel-dark', value: '#000000' },
        { name: 'pixel-gray', value: '#222222' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'danger', 'warning', 'ghost'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
    },
    loading: {
      control: { type: 'boolean' },
    },
  },
  args: { onClick: () => console.log('Button clicked') },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'PRIMARY BUTTON',
    size: 'md',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'SECONDARY BUTTON',
    size: 'md',
  },
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'SUCCESS BUTTON',
    size: 'md',
  },
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'DANGER BUTTON',
    size: 'md',
  },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'WARNING BUTTON',
    size: 'md',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'GHOST BUTTON',
    size: 'md',
  },
}

export const WithIcon: Story = {
  args: {
    variant: 'primary',
    icon: '🎮',
    children: 'HOST GAME',
    size: 'lg',
  },
}

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'LOADING...',
    size: 'md',
  },
}

export const ExtraLarge: Story = {
  args: {
    variant: 'primary',
    size: 'xl',
    children: 'CREATE GAME',
  },
}

export const Large: Story = {
  args: {
    variant: 'secondary',
    size: 'lg',
    children: 'JOIN GAME',
  },
}

export const Medium: Story = {
  args: {
    variant: 'success',
    size: 'md',
    children: 'READY',
  },
}

export const Small: Story = {
  args: {
    variant: 'ghost',
    size: 'sm',
    children: 'CANCEL',
  },
}

export const AllSizes: Story = {
  args: {
    children: null, // Required by TypeScript but not used in render
  },
  render: () => (
    <div className="space-y-4 p-8">
      <div className="text-white text-[16px] font-bold mb-4">BUTTON SIZES:</div>
      <Button variant="primary" size="sm">SMALL BUTTON</Button>
      <Button variant="primary" size="md">MEDIUM BUTTON</Button>
      <Button variant="primary" size="lg">LARGE BUTTON</Button>
      <Button variant="primary" size="xl">EXTRA LARGE BUTTON</Button>
    </div>
  ),
}

export const AllVariants: Story = {
  args: {
    children: null, // Required by TypeScript but not used in render
  },
  render: () => (
    <div className="space-y-4 p-8">
      <div className="text-white text-[16px] font-bold mb-4">BUTTON VARIANTS:</div>
      <Button variant="primary" size="md">PRIMARY</Button>
      <Button variant="secondary" size="md">SECONDARY</Button>
      <Button variant="success" size="md">SUCCESS</Button>
      <Button variant="danger" size="md">DANGER</Button>
      <Button variant="warning" size="md">WARNING</Button>
      <Button variant="ghost" size="md">GHOST</Button>
    </div>
  ),
}

export const GameButtons: Story = {
  args: {
    children: null, // Required by TypeScript but not used in render
  },
  render: () => (
    <div className="space-y-6 p-8 max-w-md">
      <div className="text-white text-[16px] font-bold mb-4">GAME BUTTONS:</div>
      <Button variant="primary" size="xl" className="w-full">
        CREATE GAME
      </Button>
      <Button variant="secondary" size="xl" className="w-full">
        JOIN GAME
      </Button>
      <Button variant="success" size="lg" className="w-full">
        START ROUND
      </Button>
      <Button variant="danger" size="md">
        END GAME
      </Button>
      <Button variant="ghost" size="sm">
        SETTINGS
      </Button>
    </div>
  ),
}