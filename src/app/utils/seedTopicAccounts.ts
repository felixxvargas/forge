// Utility to seed topic accounts in Supabase database
import { projectId } from '/utils/supabase/info';

export async function seedTopicAccounts(): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/forge-api/seed/topic-accounts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to seed topic accounts: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Topic accounts seeded:', result);
    return result;
  } catch (error) {
    console.error('Error seeding topic accounts:', error);
    throw error;
  }
}
