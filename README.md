# LinguaMaster - AI-Powered Language Learning Platform

A comprehensive language learning application powered by advanced AI technologies including Google Gemini and OpenAI, featuring adaptive learning, voice interaction, and personalized curriculum generation.

## 🚀 Features

### Core Learning Features
- **Adaptive Learning System**: Personalized content based on user performance and learning patterns
- **Interactive Lessons**: Structured lessons with vocabulary, grammar, and cultural content
- **Progress Tracking**: Comprehensive tracking of learning progress, streaks, and achievements
- **Gamification**: XP system, achievements, daily challenges, and leaderboards

### AI-Powered Features
- **Comprehensive Curriculum Generation**: AI-generated learning paths and lesson plans
- **Voice Teaching**: Interactive voice conversations with AI teachers
- **Pronunciation Coaching**: Real-time speech analysis and feedback
- **Personalized Exercises**: Adaptive exercises targeting individual weaknesses
- **Intelligent Tutoring**: 24/7 AI teacher for questions and guidance
- **Cultural Content**: AI-generated cultural insights and context

### Technical Features
- **Production-Ready**: Comprehensive error handling, security, and monitoring
- **Scalable Architecture**: Modular design with caching and rate limiting
- **Voice Integration**: Speech-to-text and text-to-speech capabilities
- **Real-time Updates**: Live progress tracking and instant feedback
- **Responsive Design**: Mobile-first design that works on all devices

## 🛠 Technology Stack

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** with Drizzle ORM
- **Google Gemini AI** for advanced language processing
- **OpenAI** for additional AI capabilities
- **Express Rate Limiting** and security middleware

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TanStack Query** for state management
- **shadcn/ui** with Tailwind CSS for beautiful UI
- **Wouter** for routing

### AI Services
- **Curriculum Generation**: Adaptive lesson planning
- **Voice Teaching**: Interactive conversation system
- **Speech Analysis**: Pronunciation feedback and coaching
- **Adaptive Learning**: Performance-based content adjustment
- **Content Generation**: Vocabulary, grammar, and cultural content

## 🏗 Setup Instructions

### Prerequisites
- Node.js 18+ and npm 8+
- PostgreSQL database
- Google AI API key
- OpenAI API key (optional, for additional features)

### Environment Setup

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables by copying `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Configure your environment variables:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/linguamaster

# AI Services
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Application
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_super_secret_session_key_here
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🐳 Docker Deployment

### Build and Run with Docker

```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run
```

### Docker Compose (Production)

```yaml
version: '3.8'
services:
  linguamaster:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - postgres
      
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: linguamaster
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
volumes:
  postgres_data:
```

## 📁 Project Structure

```
linguamaster/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                 # Backend Express application
│   ├── middleware/        # Security and validation middleware
│   ├── services/          # AI and business logic services
│   ├── routes/            # API route handlers
│   └── utils/             # Backend utilities
├── shared/                 # Shared types and schemas
└── database/              # Database schema and migrations
```

## 🤖 AI Services Architecture

### Gemini AI Integration
- **Primary AI Provider**: Google Gemini for most AI features
- **Curriculum Generation**: Comprehensive lesson planning
- **Voice Teaching**: Interactive conversation management
- **Content Generation**: Vocabulary, grammar, cultural content

### Voice Teaching System
- **Interactive Conversations**: Real-time AI teacher interactions
- **Pronunciation Coaching**: Detailed speech analysis and feedback
- **Adaptive Responses**: Context-aware teaching responses
- **Progress Tracking**: Session-based learning analytics

### Adaptive Learning Engine
- **Performance Analysis**: User behavior and progress tracking
- **Content Personalization**: Difficulty and topic adaptation
- **Spaced Repetition**: Optimized review scheduling
- **Weakness Targeting**: Focus on individual learning gaps

## 🔒 Security Features

### Production Security
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive request sanitization
- **Security Headers**: CORS, CSP, and other security headers
- **Error Handling**: Secure error responses without information leakage
- **Session Management**: Secure user authentication

### Data Protection
- **Password Hashing**: Secure password storage
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: Request validation

## 📊 Monitoring and Logging

### Application Monitoring
- **Structured Logging**: Comprehensive application logging
- **Error Tracking**: Detailed error reporting and stack traces
- **Performance Metrics**: Response times and resource usage
- **Health Checks**: Application and dependency health monitoring

### User Analytics
- **Learning Progress**: Detailed progress tracking
- **Performance Metrics**: Accuracy, speed, and engagement
- **Usage Patterns**: Feature usage and learning behavior
- **AI Effectiveness**: AI teaching success metrics

## 🚀 Deployment

### Production Deployment

1. **Build the application**:
```bash
npm run build
```

2. **Set production environment variables**
3. **Deploy using Docker or your preferred platform**
4. **Configure reverse proxy (nginx) if needed**
5. **Set up SSL/TLS certificates**
6. **Configure monitoring and logging**

### Scaling Considerations
- **Database**: PostgreSQL with connection pooling
- **Caching**: In-memory caching for AI responses
- **Load Balancing**: Multiple app instances behind load balancer
- **AI Rate Limits**: Respect AI service rate limits
- **CDN**: Static asset delivery optimization

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Push database schema
npm run test         # Run tests
npm run lint         # Lint code
npm run typecheck    # TypeScript type checking
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📝 API Documentation

### Core Endpoints
- `POST /api/login` - User authentication
- `POST /api/register` - User registration
- `GET /api/user/languages` - User's languages
- `GET /api/lessons` - Available lessons

### AI Endpoints
- `POST /api/ai/comprehensive-lesson` - Generate complete AI lesson
- `POST /api/ai/personalized-exercises` - Create adaptive exercises
- `POST /api/ai/voice/conversation/start` - Start voice session
- `POST /api/ai/voice/pronunciation` - Get pronunciation coaching
- `POST /api/ai/vocabulary` - Generate vocabulary lists

## 🎯 Future Enhancements

### Planned Features
- **Mobile App**: React Native mobile application
- **Offline Mode**: Downloadable lessons for offline learning
- **Group Learning**: Collaborative learning features
- **Advanced Analytics**: ML-powered learning insights
- **Integration APIs**: Third-party platform integrations

### AI Improvements
- **Multimodal Learning**: Vision and text integration
- **Advanced Speech**: Better pronunciation analysis
- **Emotional Intelligence**: Mood-aware teaching
- **Predictive Analytics**: Learning outcome predictions

## 📞 Support

For support, feature requests, or bug reports:
- Create an issue in the repository
- Contact the development team
- Check the documentation and FAQ

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**LinguaMaster** - Empowering language learners with AI-driven personalized education.