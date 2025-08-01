import type { Preview } from '@storybook/react'
import React from 'react'
import '../src/app/globals.css'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'quiz-bg',
      values: [
        {
          name: 'quiz-bg',
          value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
  },
  decorators: [
    (Story) => React.createElement(
      'div',
      { className: 'min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8' },
      React.createElement(Story)
    ),
  ],
}

export default preview