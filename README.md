# Hilites Backend API

A Node.js backend API for the Hilites social soccer highlights app, built with Express.js and Supabase.

## Features

- **User Authentication**: Sign up, sign in, sign out, and profile management
- **User Preferences**: Save and manage favorite teams and players
- **Security**: JWT authentication, rate limiting, CORS protection
- **Database**: PostgreSQL with Supabase integration
- **Validation**: Request validation with Joi

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

1. Copy the example environment file:

```bash
cp env.example .env
```

2. Update `.env` with your Supabase credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
```

### 3. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL commands from `database-schema.md` to create the required tables

### 4. Start the Server

For development:

```bash
npm run dev
```

For production:

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/signin` - Sign in to an existing account
- `POST /api/auth/signout` - Sign out (requires authentication)
- `GET /api/auth/profile` - Get current user profile (requires authentication)
- `PUT /api/auth/profile` - Update user profile (requires authentication)

### User Preferences

- `GET /api/preferences` - Get all user preferences (teams and players)
- `GET /api/preferences/teams` - Get favorite teams (requires authentication)
- `POST /api/preferences/teams` - Add favorite team (requires authentication)
- `DELETE /api/preferences/teams/:teamId` - Remove favorite team (requires authentication)
- `GET /api/preferences/players` - Get favorite players (requires authentication)
- `POST /api/preferences/players` - Add favorite player (requires authentication)
- `DELETE /api/preferences/players/:playerId` - Remove favorite player (requires authentication)

### Health Check

- `GET /health` - Server health check

## Request/Response Examples

### Sign Up

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

### Add Favorite Team

```bash
POST /api/preferences/teams
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "team_id": "team_123",
  "team_name": "Manchester United",
  "team_logo": "https://example.com/logo.png"
}
```

## Project Structure

```
hilites-backend/
├── config/
│   └── supabase.js          # Supabase client configuration
├── middleware/
│   ├── auth.js              # Authentication middleware
│   └── validation.js        # Request validation middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   └── preferences.js       # User preferences routes
├── server.js                # Main server file
├── package.json             # Dependencies and scripts
├── env.example              # Environment variables template
├── database-schema.md       # Database schema documentation
└── README.md               # This file
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Prevents abuse with request limits
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Request validation with Joi
- **Row Level Security**: Database-level security with Supabase RLS

## Development

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run tests (to be implemented)

### Environment Variables

| Variable                    | Description                          | Required           |
| --------------------------- | ------------------------------------ | ------------------ |
| `SUPABASE_URL`              | Your Supabase project URL            | Yes                |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key               | Yes                |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key            | Yes                |
| `PORT`                      | Server port                          | No (default: 3000) |
| `NODE_ENV`                  | Environment (development/production) | No                 |
| `JWT_SECRET`                | JWT secret key                       | No                 |

## Future Enhancements

This MVP includes basic user authentication and preferences. Future versions will include:

- Social features (following users, comments, notifications)
- Highlight video management
- Advanced search and filtering
- Real-time notifications
- File upload for user avatars

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
