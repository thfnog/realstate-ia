/**
 * Slack Notification Utility
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export type SlackNotificationType = 'health' | 'lead' | 'reminder' | 'error' | 'system';

interface SlackOptions {
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

/**
 * Sends a notification to Slack
 */
export async function sendSlackNotification(
  message: string, 
  type: SlackNotificationType = 'system',
  options: SlackOptions = {}
) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('⚠️ SLACK_WEBHOOK_URL not configured. Skipping notification.');
    return false;
  }

  let emoji = '⚙️';
  let title = 'Sistema';

  switch (type) {
    case 'health':
      emoji = '🏥';
      title = 'Saúde do Sistema';
      break;
    case 'lead':
      emoji = '🎯';
      title = 'Novo Lead';
      break;
    case 'reminder':
      emoji = '⏰';
      title = 'Lembrete de Inatividade';
      break;
    case 'error':
      emoji = '🚨';
      title = 'Erro Crítico';
      break;
  }

  const payload = {
    text: `${emoji} *${title}* ${options.username ? `(${options.username})` : ''}\n\n${message}`,
    channel: options.channel,
    username: options.username || 'ImobIA Bot',
    icon_emoji: options.icon_emoji || emoji
  };

  try {
    const res = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Slack Error (${res.status}): ${errText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error);
    return false;
  }
}
