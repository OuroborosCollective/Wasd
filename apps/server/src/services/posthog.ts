import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY || '';
const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

export const posthog = new PostHog(apiKey, {
  host,
});

// Ensure posthog captures events before process exit
process.on('beforeExit', async () => {
  await posthog.shutdown();
});

export default posthog;