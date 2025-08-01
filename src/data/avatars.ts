export const avatars = [
    '🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🐸',
    '🐵', '🦄', '🐺', '🦝', '🐹', '🐰', '🦔', '🐧',
    '🦆', '🐢', '🦀', '🐙', '🦋', '🐝', '🐞', '🦗',
    '🎮', '🎯', '🎪', '🎨', '🎭', '🎲', '🎸', '🎺'
  ]

  export const getRandomAvatar = (): string => {
    return avatars[Math.floor(Math.random() * avatars.length)]
  }
  
  export const getAvatarByIndex = (index: number): string => {
    return avatars[index % avatars.length]
  }
  