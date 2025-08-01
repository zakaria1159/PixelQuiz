import { Question, QuestionCategory } from '@/types/question'

export const sampleQuestions: Question[] = [
  {
    id: '1',
    type: 'multiple_choice',
    question: 'Which streaming platform is known for its purple branding?',
    options: ['YouTube', 'Twitch', 'TikTok', 'Instagram'],
    correctAnswer: 1,
    timeLimit: 15,
    category: 'streaming',
    difficulty: 'easy',
    explanation: 'Twitch uses purple as its primary brand color and is the leading live streaming platform for gaming.'
  },
  {
    id: '2',
    type: 'multiple_choice',
    question: 'What does "POG" typically mean in gaming chat?',
    options: ['Play Of the Game', 'Pretty Good', 'Piece Of Garbage', 'Point Of Games'],
    correctAnswer: 0,
    timeLimit: 15,
    category: 'gaming',
    difficulty: 'medium',
    explanation: 'POG originated from "Play of the Game" and became a popular emote expressing excitement.'
  },
  {
    id: '3',
    type: 'true_false',
    question: 'TikTok was originally called Musical.ly',
    options: ['True', 'False'],
    correctAnswer: 0,
    timeLimit: 10,
    category: 'pop_culture',
    difficulty: 'easy',
    explanation: 'Musical.ly was acquired by ByteDance and rebranded as TikTok in 2018.'
  },
  {
    id: '4',
    type: 'multiple_choice',
    question: 'Which country has won the most FIFA World Cups?',
    options: ['Germany', 'Argentina', 'Brazil', 'France'],
    correctAnswer: 2,
    timeLimit: 15,
    category: 'sports',
    difficulty: 'medium',
    explanation: 'Brazil has won the FIFA World Cup 5 times (1958, 1962, 1970, 1994, 2002).'
  },
  {
    id: '5',
    type: 'multiple_choice',
    question: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctAnswer: 2,
    timeLimit: 15,
    category: 'geography',
    difficulty: 'medium',
    explanation: 'Canberra is the capital city of Australia, located between Sydney and Melbourne.'
  },
  {
    id: '6',
    type: 'multiple_choice',
    question: 'Which movie won Best Picture at the 2023 Academy Awards?',
    options: ['Top Gun: Maverick', 'Everything Everywhere All at Once', 'The Banshees of Inisherin', 'Avatar: The Way of Water'],
    correctAnswer: 1,
    timeLimit: 20,
    category: 'movies',
    difficulty: 'hard',
    explanation: 'Everything Everywhere All at Once won 7 Oscars including Best Picture in 2023.'
  },
  {
    id: '7',
    type: 'true_false',
    question: 'The human brain contains approximately 86 billion neurons',
    options: ['True', 'False'],
    correctAnswer: 0,
    timeLimit: 12,
    category: 'science',
    difficulty: 'hard',
    explanation: 'Recent estimates suggest the human brain contains around 86 billion neurons.'
  },
  {
    id: '8',
    type: 'multiple_choice',
    question: 'Which artist had the most-streamed song on Spotify in 2023?',
    options: ['Bad Bunny', 'Taylor Swift', 'The Weeknd', 'Harry Styles'],
    correctAnswer: 0,
    timeLimit: 15,
    category: 'music',
    difficulty: 'medium',
    explanation: 'Bad Bunny dominated Spotify in 2023 with "Un Verano Sin Ti" being highly streamed.'
  },
  {
    id: '9',
    type: 'multiple_choice',
    question: 'What does the meme "This is fine" feature?',
    options: ['A cat in a box', 'A dog in a burning room', 'A person drinking coffee', 'A house on fire'],
    correctAnswer: 1,
    timeLimit: 12,
    category: 'memes',
    difficulty: 'easy',
    explanation: 'The "This is fine" meme shows a dog sitting in a burning room, representing denial in crisis situations.'
  },
  {
    id: '10',
    type: 'multiple_choice',
    question: 'The Great Wall of China was built primarily during which dynasty?',
    options: ['Tang Dynasty', 'Ming Dynasty', 'Qing Dynasty', 'Song Dynasty'],
    correctAnswer: 1,
    timeLimit: 18,
    category: 'history',
    difficulty: 'hard',
    explanation: 'While walls existed earlier, most of the Great Wall we see today was built during the Ming Dynasty (1368-1644).'
  }
]

export const getQuestionsByCategory = (category: QuestionCategory): Question[] => {
  return sampleQuestions.filter(q => q.category === category)
}

export const getQuestionsByDifficulty = (difficulty: 'easy' | 'medium' | 'hard'): Question[] => {
  return sampleQuestions.filter(q => q.difficulty === difficulty)
}
