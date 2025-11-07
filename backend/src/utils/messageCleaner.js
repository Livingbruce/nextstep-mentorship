// Utility for cleaning up bot messages and implementing auto-deletion

export class MessageCleaner {
  constructor() {
    this.messageQueue = new Map(); // Store messages to be deleted
  }

  // Schedule a message for deletion after a delay
  scheduleDeletion(ctx, messageId, delay = 3000) {
    const timeoutId = setTimeout(() => {
      this.deleteMessage(ctx, messageId);
    }, delay);
    
    this.messageQueue.set(messageId, timeoutId);
  }

  // Delete a specific message
  async deleteMessage(ctx, messageId) {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
      this.messageQueue.delete(messageId);
    } catch (error) {
      console.error(`Failed to delete message ${messageId}:`, error);
    }
  }

  // Clean up all scheduled deletions for a user
  clearUserMessages(userId) {
    // This would need to be implemented based on how you track user messages
    // For now, we'll clear all scheduled deletions
    for (const [messageId, timeoutId] of this.messageQueue) {
      clearTimeout(timeoutId);
    }
    this.messageQueue.clear();
  }

  // Send a temporary message that gets deleted after delay
  async sendTemporaryMessage(ctx, text, delay = 3000) {
    try {
      const message = await ctx.reply(text);
      this.scheduleDeletion(ctx, message.message_id, delay);
      return message;
    } catch (error) {
      console.error('Failed to send temporary message:', error);
      return null;
    }
  }

  // Send a message and keep only the last one (delete previous)
  async sendReplacingMessage(ctx, text, previousMessageId = null) {
    try {
      // Delete previous message if provided
      if (previousMessageId) {
        await this.deleteMessage(ctx, previousMessageId);
      }
      
      // Send new message
      const message = await ctx.reply(text);
      return message;
    } catch (error) {
      console.error('Failed to send replacing message:', error);
      return null;
    }
  }
}

export default new MessageCleaner();
