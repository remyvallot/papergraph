# Supabase Edge Functions Configuration

## Setup Instructions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link your project
```bash
supabase link --project-ref lqbcatqdfsgvbwenqupq
```

### 4. Set the GitHub Bot Token Secret
```bash
supabase secrets set GITHUB_BOT_TOKEN=your_github_personal_access_token_here
```

**To create a GitHub Personal Access Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "PaperGraph Gallery Bot"
4. Select scopes: `repo` (Full control of private repositories)
5. Click "Generate token"
6. Copy the token and use it in the command above

### 5. Deploy the function
```bash
supabase functions deploy submit-to-gallery
```

### 6. Test locally (optional)
```bash
supabase start
supabase functions serve submit-to-gallery --env-file ./supabase/.env.local
```

## Environment Variables Required

- `GITHUB_BOT_TOKEN` - GitHub Personal Access Token with `repo` scope
- `SUPABASE_URL` - Automatically provided
- `SUPABASE_ANON_KEY` - Automatically provided

## Function URL

After deployment, your function will be available at:
```
https://lqbcatqdfsgvbwenqupq.supabase.co/functions/v1/submit-to-gallery
```

## Usage from Frontend

```javascript
const response = await fetch(
  'https://lqbcatqdfsgvbwenqupq.supabase.co/functions/v1/submit-to-gallery',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId: 'uuid',
      projectData: { /* project JSON */ },
      title: 'Project Title',
      description: 'Short description...',
      author: 'Full Name',
      affiliation: 'University',
      thumbnailBase64: 'base64string' // optional
    })
  }
);

const result = await response.json();
// { success: true, prUrl: 'https://github.com/...', prNumber: 123, folderName: 'username_2025-11-08' }
```
