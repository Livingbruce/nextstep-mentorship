import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Create a bot instance for sending messages
const bot = new Telegraf(process.env.BOT_TOKEN);

export async function sendMessageToUser(telegramUserId, message) {
  try {
    await bot.telegram.sendMessage(telegramUserId, message, { parse_mode: 'Markdown' });
    console.log(`✅ Message sent to user ${telegramUserId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending message to user ${telegramUserId}:`, error);
    return false;
  }
}

export default bot;
