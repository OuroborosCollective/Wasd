import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host,

    });
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}
