# Scorebat Embed Token Setup

## Environment Variables Required

Add these environment variables to your `.env` file:

```bash
# Scorebat API Access Token for v3 API
VIDEO_API_ACCESS_TOKEN=your_video_api_access_token_here

# Scorebat Embed Token for enhanced video widgets
EMBED_TOKEN=your_embed_token_here
```

## How It Works

1. **Backend**: The `VIDEO_API_ACCESS_TOKEN` is used to fetch highlights from the Scorebat v3 API
2. **Frontend**: The `EMBED_TOKEN` is passed to the frontend and used to enhance video embeds with Scorebat's widget
3. **Enhanced Videos**: Instead of basic iframe embeds, the frontend uses Scorebat's embed widget for better video playback

## API Response Structure

The backend now returns:

```json
{
  "success": true,
  "data": [...highlights],
  "leagues": [...unique_competitions],
  "embedToken": "your_embed_token",
  "count": 150,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

## Frontend Usage

The embed token is automatically used in:

- `CompetitionSection` component
- `FollowingSection` component

The frontend enhances embed codes by replacing them with Scorebat's widget:

```javascript
const enhancedEmbed = enhanceEmbedWithToken(originalEmbed, embedToken);
```

## Getting Your Tokens

1. Visit [Scorebat API Documentation](https://www.scorebat.com/api/)
2. Sign up for an API account
3. Get your `VIDEO_API_ACCESS_TOKEN` for the v3 API
4. Get your `EMBED_TOKEN` for enhanced video widgets
5. Add both to your environment variables




