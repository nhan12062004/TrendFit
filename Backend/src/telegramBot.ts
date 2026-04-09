import TelegramBot from 'node-telegram-bot-api';
import { supabase } from './config/supabase';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

// Các khung giờ nhắc uống nước (9h, 11h, 14h, 16h, 20h, 22h)
const REMINDER_HOURS = ['0 9 * * *', '0 11 * * *', '0 14 * * *', '0 16 * * *', '0 20 * * *', '0 22 * * *'];

const WATER_MESSAGES = [
  "💧 Đã đến lúc uống một ly nước rồi bạn ơi! Để cơ thể luôn khỏe khoắn nhé. 🥤",
  "🔔 Nhắc nhở: Uống nước giúp tăng cường trao đổi chất và làm đẹp da đấy! ✨",
  "🥤 Đừng quên bổ sung nước nhé! Một ly nước ngay lúc này sẽ giúp bạn tỉnh táo hơn. 🌊",
  "💧 Cơ thể bạn đang cần nước! Hãy tạm dừng công việc 1 phút để uống nước nhé. 🧘‍♂️",
  "🥤 Chào buổi tối! Đừng quên ly nước cuối ngày để thanh lọc cơ thể nhé. 🌙",
  "💧 Một ly nước nhẹ nhàng trước khi ngủ nhé! Chúc bạn có giấc ngủ ngon. 🌙💤"
];

const setupDailyReminders = (bot: TelegramBot) => {
  // 1. Nhắc uống nước (nhiều khung giờ)
  REMINDER_HOURS.forEach((schedule, index) => {
    cron.schedule(schedule, async () => {
      console.log(`⏰ Đang gửi nhắc nhở uống nước lúc ${new Date().toLocaleTimeString('vi-VN')}...`);
      
      try {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('telegram_chat_id, full_name')
          .not('telegram_chat_id', 'is', null);

        if (error) throw error;

        if (users && users.length > 0) {
          const message = WATER_MESSAGES[index % WATER_MESSAGES.length];
          for (const user of users) {
             const personalizedMessage = `Chào ${user.full_name || 'bạn'}! ${message}`;
             await bot.sendMessage(user.telegram_chat_id, personalizedMessage);
          }
        }
      } catch (err: any) {
        console.error('❌ Lỗi gửi nhắc nhở nước:', err.message);
      }
    }, { timezone: "Asia/Ho_Chi_Minh" });
  });

  // 2. Hỏi về thời lượng giấc ngủ (9h30 sáng)
  cron.schedule('30 9 * * *', async () => { 
    console.log('⏰ Đang gửi câu hỏi về giấc ngủ...');
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('telegram_chat_id, full_name, id')
        .not('telegram_chat_id', 'is', null);

      if (error) throw error;

      if (users && users.length > 0) {
        for (const user of users) {
          await bot.sendMessage(user.telegram_chat_id, `Chào ${user.full_name || 'bạn'}! Đêm qua bạn đã ngủ được bao nhiêu tiếng? 😴`, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '5h', callback_data: `sleep_5` },
                  { text: '6h', callback_data: `sleep_6` },
                  { text: '7h', callback_data: `sleep_7` },
                  { text: '8h', callback_data: `sleep_8` }
                ],
                [
                  { text: '9h', callback_data: `sleep_9` },
                  { text: '10h+', callback_data: `sleep_10` },
                  { text: 'Kém (<5h)', callback_data: `sleep_4` }
                ]
              ]
            }
          });
        }
      }
    } catch (err: any) {
      console.error('❌ Lỗi gửi câu hỏi giấc ngủ:', err.message);
    }
  }, { timezone: "Asia/Ho_Chi_Minh" });

  console.log('📅 Đã thiết lập lịch nhắc nhở Nước & Giấc ngủ (Asia/Ho_Chi_Minh).');

  // Xử lý phản hồi nút bấm
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;

    if (!chatId || !data) return;

    if (data.startsWith('sleep_')) {
      const hours = parseInt(data.replace('sleep_', ''));
      const today = new Date().toISOString().split('T')[0];

      try {
        // Tìm userId từ chatId
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_chat_id', chatId.toString())
          .single();

        if (userProfile) {
          const { error } = await supabase
            .from('daily_progress_logs')
            .upsert({
              user_id: userProfile.id,
              log_date: today,
              sleep_hours: hours
            }, { onConflict: 'user_id,log_date' });

          if (error) throw error;

          await bot.answerCallbackQuery(query.id, { text: `Đã ghi nhận ${hours}h ngủ! 🎉` });
          await bot.editMessageText(`✅ Tuyệt vời! Bạn đã ngủ ${hours} giờ. Dữ liệu đã được cập nhật vào TrendFit! 💪`, {
            chat_id: chatId,
            message_id: query.message?.message_id
          });
        }
      } catch (err: any) {
        console.error('❌ Lỗi lưu giấc ngủ:', err.message);
        await bot.answerCallbackQuery(query.id, { text: 'Có lỗi khi lưu dữ liệu.' });
      }
    }
  });
};

export const initTelegramBot = () => {
  if (!token) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN không tồn tại. Bot sẽ không được khởi chạy.');
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  console.log('🤖 Telegram Bot đang chạy và lắng nghe tin nhắn...');

  // Thiết lập lịch nhắc nhở
  setupDailyReminders(bot);

  // Xử lý lệnh /start kèm theo userId (Deep Linking)
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
