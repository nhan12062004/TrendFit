import TelegramBot from 'node-telegram-bot-api';
import { supabase } from './config/supabase';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

export const initTelegramBot = () => {
  if (!token) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN không tồn tại. Bot sẽ không được khởi chạy.');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  console.log('🤖 Telegram Bot đang chạy và lắng nghe tin nhắn...');

  // Xử lý lệnh /start kèm theo userId (Deep Linking)
  // URL mẫu: https://t.me/your_bot?start=user_id
  bot.onText(/\/start (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = match ? match[1] : null;

    if (!userId) {
      return bot.sendMessage(chatId, 'Chào mừng bạn đến với TrendFit! Vui lòng sử dụng nút "Kết nối Telegram" trên website để liên kết tài khoản nhé.');
    }

    try {
      // Cập nhật telegram_chat_id vào bảng profiles của người dùng tương ứng
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: chatId.toString() })
        .eq('id', userId);

      if (error) throw error;

      bot.sendMessage(chatId, '🎉 Chúc mừng! Tài khoản TrendFit của bạn đã được liên kết thành công.\n\nTừ giờ, tôi sẽ gửi báo cáo tập luyện và lời nhắc AI trực tiếp tại đây cho bạn.');
      console.log(`✅ Đã liên kết Telegram cho User: ${userId}`);
    } catch (err: any) {
      console.error('❌ Lỗi liên kết Telegram:', err.message);
      bot.sendMessage(chatId, '❌ Có lỗi xảy ra trong quá trình liên kết. Vui lòng đảm bảo bạn đã tạo hồ sơ trên website trước khi kết nối.');
    }
  });

  // Xử lý lệnh /start không có tham số
  bot.onText(/\/start$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Chào mừng bạn đến với AI Fitness Assistant! 🚀\n\nĐể tôi có thể nhận diện và hỗ trợ bạn tốt nhất, hãy nhấn nút "Kết nối AI Bot Telegram" trong phần Cài đặt trên ứng dụng TrendFit nhé.');
  });

  // Xử lý tin nhắn thông thường
  bot.on('message', (msg) => {
    if (msg.text?.startsWith('/start')) return;
    
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Tôi đã nhận được tin nhắn của bạn. Sau khi liên kết tài khoản, tôi sẽ phản hồi thông minh hơn dựa trên dữ liệu sức khỏe của bạn! 💪');
  });

  return bot;
};
