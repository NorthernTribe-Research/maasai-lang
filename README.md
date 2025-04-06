# LinguaMaster

A comprehensive language learning platform that combines cutting-edge AI personalization with engaging gamification techniques. The application supports multiple languages, offers adaptive learning experiences, and provides an intuitive user interface with light and dark mode options.

## Features

- **Multi-language Support**: Learn multiple languages in one unified platform
- **Gamified Learning**: Earn XP, unlock achievements, and maintain streaks
- **Personalized Learning Paths**: AI-powered learning recommendations
- **Interactive Pronunciation Practice**: Real-time feedback on pronunciation
- **Cultural Insights**: Learn about cultural context via language mascot companions
- **Comprehensive Progress Tracking**: Monitor your learning journey
- **Leaderboards & Social Features**: Compete with friends and other learners
- **Responsive Design**: Works beautifully on desktop and mobile devices
- **Admin Dashboard**: Manage content and view user statistics

## Tech Stack

- **Frontend**: React, TailwindCSS, Shadcn UI components
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI API, Google Gemini API
- **Authentication**: Secure user authentication with passport.js

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys for Google Gemini and OpenAI

### Environment Variables

Create a `.env` file with the following variables:

```
DATABASE_URL="postgresql://username:password@localhost:5432/yourdatabase"
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="your-openai-api-key"
```

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Push database schema: `npm run db:push`
4. Start the development server: `npm run dev`

### Admin Access

The default admin account is:
- Username: admin
- Password: admin123

## Usage

### User Interface

- **Dashboard**: View your progress, streaks, and recommendations
- **Lessons**: Access structured language lessons
- **Practice**: Test your skills with various exercise types
- **Achievements**: Track your learning milestones
- **Leaderboard**: Compare your progress with other learners
- **Profile**: Manage your account and preferences

### Admin Interface

Access the admin dashboard by logging in with an admin account and clicking "Admin Dashboard" in the user dropdown menu. From here you can:

- Add/edit languages
- Create new lessons and learning content
- Manage challenges
- View user statistics

## Code Structure

- `/client`: Frontend React application
  - `/src/components`: UI components
  - `/src/pages`: Page components
  - `/src/hooks`: Custom React hooks
  - `/src/lib`: Utility functions

- `/server`: Backend Express application
  - `/routes`: API routes
  - `/services`: Business logic
  - `/auth.ts`: Authentication setup

- `/shared`: Shared code between client and server
  - `/schema.ts`: Database schema and types

## License

This project is licensed under the MIT License.

## Credits

The LinguaMaster team