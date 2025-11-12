import bot from '../bot.js';

export async function sendMessageToUser(telegramUserId, message) {
  try {
    if (!telegramUserId) {
      console.error(`[BotSender] No Telegram user ID provided`);
      return false;
    }
    
    if (!bot || !bot.telegram) {
      console.error(`[BotSender] Bot instance not initialized`);
      return false;
    }
    
    await bot.telegram.sendMessage(telegramUserId, message, { parse_mode: 'Markdown' });
    console.log(`[BotSender] ✅ Message sent to user ${telegramUserId}`);
    return true;
  } catch (error) {
    console.error(`[BotSender] ❌ Error sending message to user ${telegramUserId}:`, error.message || error);
    // Check if it's a specific Telegram API error
    if (error.response) {
      console.error(`[BotSender] Telegram API error:`, error.response);
    }
    return false;
  }
}

export default bot;
