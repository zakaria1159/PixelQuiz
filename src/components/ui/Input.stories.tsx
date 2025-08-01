// src/components/ui/Input.stories.ts
import type { Meta, StoryObj } from '@storybook/react'
import { User, Lock } from 'lucide-react'
import Input from './Input'

const meta = {
  title: 'UI/Input',
  component: Input,
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
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number'],
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'ENTER TEXT...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'PLAYER NAME',
    placeholder: 'ENTER YOUR NAME',
  },
}

export const GameCode: Story = {
  args: {
    label: 'GAME CODE',  
    placeholder: 'ABC123',
    maxLength: 6,
  },
}

export const PlayerName: Story = {
  args: {
    label: 'YOUR NAME',
    placeholder: 'ENTER YOUR NAME',
    maxLength: 20,
  },
}

export const WithError: Story = {
  args: {
    label: 'GAME CODE',
    placeholder: 'ABC123',
    error: 'GAME CODE IS REQUIRED',
    value: '',
  },
}

export const Password: Story = {
  args: {
    label: 'PASSWORD',
    type: 'password',
    placeholder: 'ENTER PASSWORD',
  },
}

export const Email: Story = {
  args: {
    label: 'EMAIL',
    type: 'email',
    placeholder: 'YOUR@EMAIL.COM',
  },
}

export const Number: Story = {
  args: {
    label: 'SCORE',
    type: 'number',
    placeholder: '0',
  },
}

export const GameForm: Story = {
  args: {
    placeholder: '', // Required by TypeScript but not used in render
  },
  render: () => (
    <div className="space-y-6 p-8 max-w-md">
      <div className="text-white text-[16px] font-bold mb-6">GAME FORM:</div>
      <Input
        label="PLAYER NAME"
        placeholder="ENTER YOUR NAME"
        maxLength={20}
      />
      <Input
        label="GAME CODE"
        placeholder="ABC123"
        maxLength={6}
      />
      <Input
        label="EMAIL (OPTIONAL)"
        type="email"
        placeholder="YOUR@EMAIL.COM"
      />
    </div>
  ),
}

export const WithStates: Story = {
  args: {
    placeholder: '', // Required by TypeScript but not used in render
  },
  render: () => (
    <div className="space-y-6 p-8 max-w-md">
      <div className="text-white text-[16px] font-bold mb-6">INPUT STATES:</div>
      
      <div>
        <div className="text-white text-[12px] mb-2">NORMAL:</div>
        <Input placeholder="NORMAL INPUT" />
      </div>
      
      <div>
        <div className="text-white text-[12px] mb-2">WITH VALUE:</div>
        <Input placeholder="PLACEHOLDER" value="TYPED VALUE" />
      </div>
      
      <div>
        <div className="text-white text-[12px] mb-2">ERROR STATE:</div>
        <Input 
          placeholder="ERROR INPUT" 
          error="THIS FIELD IS REQUIRED"
          value=""
        />
      </div>
      
      <div>
        <div className="text-white text-[12px] mb-2">DISABLED:</div>
        <Input 
          placeholder="DISABLED INPUT" 
          disabled
          value="CANNOT EDIT"
        />
      </div>
    </div>
  ),
}