import TelegramBot from 'node-telegram-bot-api';
import { supabase } from './config/supabase';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

// === BỘ NHỚ HỘI THOẠI ===
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const conversationStore = new Map<number, ChatMessage[]>();
const MAX_HISTORY = 20; // Giữ tối đa 20 tin nhắn gần nhất
const HISTORY_TTL_MS = 2 * 60 * 60 * 1000; // Xóa sau 2 giờ không hoạt động

function getHistory(chatId: number): ChatMessage[] {
  const history = conversationStore.get(chatId) || [];
  const now = Date.now();
  // Lọc bỏ tin nhắn quá cũ
  const fresh = history.filter(m => now - m.timestamp < HISTORY_TTL_MS);
  if (fresh.length !== history.length) conversationStore.set(chatId, fresh);
  return fresh;
}

function addToHistory(chatId: number, role: 'user' | 'assistant', content: string) {
  const history = getHistory(chatId);
  history.push({ role, content, timestamp: Date.now() });
  // Giữ tối đa MAX_HISTORY tin
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  conversationStore.set(chatId, history);
}

function clearHistory(chatId: number) {
  conversationStore.delete(chatId);
}

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
const WATER_PER_CONFIRM_ML = 250;

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
            await bot.sendMessage(user.telegram_chat_id, personalizedMessage, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Đã uống', callback_data: 'water_done' }]
                ]
              }
            });
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

    if (data === 'water_done') {
      const today = new Date().toISOString().split('T')[0];

      try {
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_chat_id', chatId.toString())
          .single();

        if (userError) throw userError;

        if (!userProfile) {
          await bot.answerCallbackQuery(query.id, { text: 'Không tìm thấy tài khoản liên kết.' });
          return;
        }

        const { data: existingLog, error: existingLogError } = await supabase
          .from('daily_progress_logs')
          .select('water_intake_ml')
          .eq('user_id', userProfile.id)
          .eq('log_date', today)
          .maybeSingle();

        if (existingLogError) throw existingLogError;

        const nextWaterIntakeMl = (existingLog?.water_intake_ml || 0) + WATER_PER_CONFIRM_ML;

        const { error: saveError } = await supabase
          .from('daily_progress_logs')
          .upsert({
            user_id: userProfile.id,
            log_date: today,
            water_intake_ml: nextWaterIntakeMl
          }, { onConflict: 'user_id,log_date' });

        if (saveError) throw saveError;

        await bot.answerCallbackQuery(query.id, {
          text: `Đã ghi nhận +${WATER_PER_CONFIRM_ML}ml nước!`
        });

        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          {
            chat_id: chatId,
            message_id: query.message?.message_id
          }
        );
      } catch (err: any) {
        console.error('❌ Lỗi lưu nước uống:', err.message);
        await bot.answerCallbackQuery(query.id, { text: 'Có lỗi khi lưu dữ liệu.' });
      }

      return;
    }

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

  // Lệnh /clear - Xóa lịch sử cuộc trò chuyện
  bot.onText(/\/clear/, (msg) => {
    clearHistory(msg.chat.id);
    bot.sendMessage(msg.chat.id, '🧹 Đã xóa lịch sử trò chuyện. Bạn có thể bắt đầu cuộc hội thoại mới!');
  });

  // Xử lý tin nhắn thông thường với AI
  bot.on('message', async (msg) => {
    if (msg.text?.startsWith('/') || !msg.text) return;

    const chatId = msg.chat.id;
    const userMessage = msg.text;

    try {
      // 1. Hiển thị trạng thái "đang gõ..."
      bot.sendChatAction(chatId, 'typing');

      // 2. Tìm thông tin người dùng từ DB dựa trên chatId
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, full_name, gender')
        .eq('telegram_chat_id', chatId.toString())
        .maybeSingle();

      if (userProfile?.id) {
        // Lấy ngày hôm nay theo giờ VN để query
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        const today = `${parts.find((p: any) => p.type === 'year')?.value}-${parts.find((p: any) => p.type === 'month')?.value}-${parts.find((p: any) => p.type === 'day')?.value}`;

        // === PRE-PROCESSING: Phát hiện ý định ghi nước uống ===
        let actionLog = ""; // Ghi lại hành động đã thực hiện để báo cho AI
        const waterMatch = userMessage.match(/(\d+)\s*(ml|lít|lit|l)\b/i);
        if (waterMatch && /uống|nước|drink|water|thêm|cộng|log/i.test(userMessage)) {
          let waterMl = parseInt(waterMatch[1]);
          const unit = waterMatch[2].toLowerCase();
          if (unit === 'lít' || unit === 'lit' || unit === 'l') waterMl *= 1000;

          const { data: existingLog } = await supabase
            .from('daily_progress_logs')
            .select('id, water_intake_ml')
            .eq('user_id', userProfile.id)
            .eq('log_date', today)
            .maybeSingle();

          if (existingLog) {
            await supabase.from('daily_progress_logs')
              .update({ water_intake_ml: (existingLog.water_intake_ml || 0) + waterMl })
              .eq('id', existingLog.id);
          } else {
            await supabase.from('daily_progress_logs')
              .insert({ user_id: userProfile.id, log_date: today, water_intake_ml: waterMl });
          }
          actionLog += `✅ Đã ghi nhận ${waterMl}ml nước.\n`;
        }

        // === PRE-PROCESSING: Hoàn thành bài tập ===
        if (/hoàn thành|xong|done|finish|complete/i.test(userMessage) && /tất cả|all/i.test(userMessage)) {
          await supabase.from('daily_exercise_sessions')
            .update({ is_completed: true })
            .eq('user_id', userProfile.id)
            .eq('log_date', today);
          actionLog += `✅ Đã đánh dấu hoàn thành TẤT CẢ bài tập hôm nay.\n`;
        } else if (/hoàn thành|xong|done|finish|complete/i.test(userMessage)) {
          // Tìm tên bài tập trong tin nhắn
          const cleanMsg = userMessage.replace(/hoàn thành|xong|done|finish|complete|bài tập|bài/gi, '').trim();
          if (cleanMsg.length > 1) {
            const { data: matchedSessions } = await supabase
              .from('daily_exercise_sessions')
              .select('id, exercises:exercise_id(name)')
              .eq('user_id', userProfile.id)
              .eq('log_date', today)
              .eq('is_completed', false);
            
            if (matchedSessions) {
              const found = matchedSessions.find((s: any) => 
                (s.exercises as any)?.name?.toLowerCase().includes(cleanMsg.toLowerCase())
              );
              if (found) {
                await supabase.from('daily_exercise_sessions')
                  .update({ is_completed: true })
                  .eq('id', found.id);
                actionLog += `✅ Đã hoàn thành bài "${(found.exercises as any)?.name}".\n`;
              }
            }
          }
        }

        // === PRE-PROCESSING: Thêm bài tập (với sets/reps/kg/rest) ===
        if (/thêm|add/i.test(userMessage) && /bài tập|bài|exercise/i.test(userMessage)) {
          // Trích xuất thông số từ tin nhắn
          const setsMatch = userMessage.match(/(\d+)\s*(sets?|hiệp|set)/i);
          const repsMatch = userMessage.match(/(\d+)\s*(reps?|lần|rep)/i);
          const kgMatch = userMessage.match(/(\d+\.?\d*)\s*(kg|kí|ký)/i);
          const restMatch = userMessage.match(/(\d+)\s*(s|giây|sec|phút)/i);
          const shortMatch = userMessage.match(/(\d+)\s*x\s*(\d+)/i); // pattern 4x10

          const sets = setsMatch ? parseInt(setsMatch[1]) : (shortMatch ? parseInt(shortMatch[1]) : 3);
          const reps = repsMatch ? repsMatch[1] : (shortMatch ? shortMatch[2] : '12');
          const weightKg = kgMatch ? parseFloat(kgMatch[1]) : 0;
          let restSeconds = 0;
          if (restMatch) {
            restSeconds = parseInt(restMatch[1]);
            if (/phút/i.test(restMatch[2])) restSeconds *= 60;
          } else {
            restSeconds = 60;
          }

          // Tách tên bài tập (bỏ các keyword và số liệu)
          const cleanMsg = userMessage
            .replace(/thêm|add|cho tôi|giúp|bài tập|bài|exercise|hôm nay/gi, '')
            .replace(/\d+\s*(sets?|hiệp|reps?|lần|kg|kí|ký|s|giây|sec|phút|x\d+)/gi, '')
            .replace(/nghỉ|rest/gi, '')
            .trim();

          if (cleanMsg.length > 1) {
            const { data: exercise } = await supabase
              .from('exercises')
              .select('id, name')
              .ilike('name', `%${cleanMsg}%`)
              .limit(1)
              .maybeSingle();
            
            if (exercise) {
              const { data: maxOrder } = await supabase
                .from('daily_exercise_sessions')
                .select('order_index')
                .eq('user_id', userProfile.id)
                .eq('log_date', today)
                .order('order_index', { ascending: false })
                .limit(1)
                .maybeSingle();

              await supabase.from('daily_exercise_sessions').insert({
                user_id: userProfile.id,
                exercise_id: exercise.id,
                log_date: today,
                sets,
                reps: String(reps),
                weight_kg: weightKg,
                rest_seconds: restSeconds,
                is_completed: false,
                order_index: (maxOrder?.order_index || 0) + 1
              });
              actionLog += `✅ Đã thêm "${exercise.name}" (${sets}x${reps} | ${weightKg}kg | nghỉ ${restSeconds}s).\n`;
            } else {
              actionLog += `⚠️ Không tìm thấy bài "${cleanMsg}" trong thư viện.\n`;
            }
          }
        }

        // === PRE-PROCESSING: Xóa bài tập ===
        if (/xóa|xoá|bỏ|remove|delete/i.test(userMessage) && /bài tập|bài|exercise/i.test(userMessage)) {
          const cleanMsg = userMessage.replace(/xóa|xoá|bỏ|remove|delete|cho tôi|giúp|bài tập|bài|exercise|hôm nay/gi, '').trim();
          if (cleanMsg.length > 1) {
            const { data: sessions } = await supabase
              .from('daily_exercise_sessions')
              .select('id, exercises:exercise_id(name)')
              .eq('user_id', userProfile.id)
              .eq('log_date', today);
            
            if (sessions) {
              const found = sessions.find((s: any) =>
                (s.exercises as any)?.name?.toLowerCase().includes(cleanMsg.toLowerCase())
              );
              if (found) {
                await supabase.from('daily_exercise_sessions').delete().eq('id', found.id);
                actionLog += `✅ Đã xóa bài "${(found.exercises as any)?.name}" khỏi lịch hôm nay.\n`;
              }
            }
          }
        }

        // === PRE-PROCESSING: Chỉnh sửa thông số bài tập ===
        if (/chỉnh|sửa|đổi|update|edit|thay đổi/i.test(userMessage) && /bài|exercise|sets?|reps?|kg|hiệp|lần/i.test(userMessage)) {
          const setsMatch = userMessage.match(/(\d+)\s*(sets?|hiệp|set)/i);
          const repsMatch = userMessage.match(/(\d+)\s*(reps?|lần|rep)/i);
          const kgMatch = userMessage.match(/(\d+\.?\d*)\s*(kg|kí|ký)/i);
          const restMatch = userMessage.match(/(\d+)\s*(s|giây|sec|phút)/i);
          const shortMatch = userMessage.match(/(\d+)\s*x\s*(\d+)/i);

          // Tách tên bài
          const cleanMsg = userMessage
            .replace(/chỉnh|sửa|đổi|update|edit|thay đổi|cho tôi|giúp|bài tập|bài|exercise|hôm nay|thành/gi, '')
            .replace(/\d+\s*(sets?|hiệp|reps?|lần|kg|kí|ký|s|giây|sec|phút|x\d+)/gi, '')
            .replace(/nghỉ|rest/gi, '')
            .trim();

          if (cleanMsg.length > 1) {
            const { data: sessions } = await supabase
              .from('daily_exercise_sessions')
              .select('id, sets, reps, weight_kg, rest_seconds, exercises:exercise_id(name)')
              .eq('user_id', userProfile.id)
              .eq('log_date', today);

            if (sessions) {
              const found = sessions.find((s: any) =>
                (s.exercises as any)?.name?.toLowerCase().includes(cleanMsg.toLowerCase())
              );
              if (found) {
                const updates: any = {};
                if (setsMatch) updates.sets = parseInt(setsMatch[1]);
                else if (shortMatch) updates.sets = parseInt(shortMatch[1]);
                if (repsMatch) updates.reps = repsMatch[1];
                else if (shortMatch) updates.reps = shortMatch[2];
                if (kgMatch) updates.weight_kg = parseFloat(kgMatch[1]);
                if (restMatch) {
                  updates.rest_seconds = parseInt(restMatch[1]);
                  if (/phút/i.test(restMatch[2])) updates.rest_seconds *= 60;
                }

                if (Object.keys(updates).length > 0) {
                  await supabase.from('daily_exercise_sessions')
                    .update(updates)
                    .eq('id', found.id);
                  const parts = [];
                  if (updates.sets || updates.reps) parts.push(`${updates.sets || found.sets}x${updates.reps || found.reps}`);
                  if (updates.weight_kg !== undefined) parts.push(`${updates.weight_kg}kg`);
                  if (updates.rest_seconds) parts.push(`nghỉ ${updates.rest_seconds}s`);
                  actionLog += `✅ Đã cập nhật "${(found.exercises as any)?.name}" → ${parts.join(' | ')}.\n`;
                }
              }
            }
          }
        }

        const calMatch = userMessage.match(/(\d+)\s*(calo|kcal|cal)\b/i);
        if (calMatch && /ăn|eat|nạp|tiêu thụ|thêm/i.test(userMessage)) {
          const calories = parseInt(calMatch[1]);
          const { data: existingLog } = await supabase
            .from('daily_progress_logs')
            .select('id, calories_consumed')
            .eq('user_id', userProfile.id)
            .eq('log_date', today)
            .maybeSingle();

          if (existingLog) {
            await supabase.from('daily_progress_logs')
              .update({ calories_consumed: (existingLog.calories_consumed || 0) + calories })
              .eq('id', existingLog.id);
          } else {
            await supabase.from('daily_progress_logs')
              .insert({ user_id: userProfile.id, log_date: today, calories_consumed: calories });
          }
          actionLog += `✅ Đã ghi nhận ${calories} kcal.\n`;
        }

        // === PRE-PROCESSING: Ghi giấc ngủ ===
        const sleepMatch = userMessage.match(/(\d+\.?\d*)\s*(tiếng|giờ|h|hour)/i);
        if (sleepMatch && /ngủ|sleep/i.test(userMessage)) {
          const hours = parseFloat(sleepMatch[1]);
          const { data: existingLog } = await supabase
            .from('daily_progress_logs')
            .select('id')
            .eq('user_id', userProfile.id)
            .eq('log_date', today)
            .maybeSingle();

          if (existingLog) {
            await supabase.from('daily_progress_logs')
              .update({ sleep_hours: hours })
              .eq('id', existingLog.id);
          } else {
            await supabase.from('daily_progress_logs')
              .insert({ user_id: userProfile.id, log_date: today, sleep_hours: hours });
          }
          actionLog += `✅ Đã ghi nhận ngủ ${hours} tiếng.\n`;
        }

        // Nếu đã liên kết, lấy thêm thông tin chi tiết và dữ liệu tracking hôm nay
        const [bodyMetrics, lifestyle, health, todayLog, todaySessions] = await Promise.all([
          supabase.from('body_metrics').select('*').eq('user_id', userProfile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('lifestyle_settings').select('*').eq('user_id', userProfile.id).maybeSingle(),
          supabase.from('health_conditions').select('*').eq('user_id', userProfile.id).maybeSingle(),
          supabase.from('daily_progress_logs').select('*').eq('user_id', userProfile.id).eq('log_date', today).maybeSingle(),
          supabase.from('daily_exercise_sessions').select('is_completed, sets, reps, weight_kg, rest_seconds, exercises:exercise_id(name)').eq('user_id', userProfile.id).eq('log_date', today)
        ]);

        let todayStatus = "";
        const waterIntake = todayLog.data?.water_intake_ml || 0;
        const waterTarget = (lifestyle.data?.daily_water_goal || 2) * 1000;
        todayStatus += `- Nước: ${waterIntake}ml / ${waterTarget}ml\n`;
        todayStatus += `- Calo: ${todayLog.data?.calories_consumed || 0} kcal\n`;
        todayStatus += `- Ngủ: ${todayLog.data?.sleep_hours || 'chưa ghi'} tiếng\n`;

        if (todaySessions.data && todaySessions.data.length > 0) {
           const exercisesText = todaySessions.data.map((s: any) => {
             const name = (s.exercises as any)?.name || 'Bài tập';
             const status = s.is_completed ? '✅' : '⬜';
             return `${name} ${s.sets || 0}x${s.reps || '-'} ${s.weight_kg || 0}kg nghỉ${s.rest_seconds || 60}s ${status}`;
           });
           todayStatus += `- Bài tập (${todaySessions.data.length}):\n  ${exercisesText.join("\n  ")}\n`;
        } else {
           todayStatus += `- Bài tập: Trống\n`;
        }

        // === XÂY DỰNG SYSTEM PROMPT CHUYÊN NGHIỆP ===
        const systemPrompt = `Bạn là "TrendFit AI" — Huấn luyện viên cá nhân & Chuyên gia dinh dưỡng cấp cao của ứng dụng TrendFit.

[HỒ SƠ KHÁCH HÀNG]
- Tên: ${userProfile.full_name || 'Học viên'}
- Cân nặng: ${bodyMetrics.data?.weight || '?'}kg | Chiều cao: ${bodyMetrics.data?.height || '?'}cm
- Mục tiêu cân nặng: ${bodyMetrics.data?.target_weight || '?'}kg
- Mục tiêu tập: ${lifestyle.data?.fitness_goal || 'Nâng cao sức khỏe'}
- Trình độ: ${lifestyle.data?.experience_level || 'Chưa rõ'} | Vận động: ${lifestyle.data?.activity_level || 'Chưa rõ'}
- Nơi tập: ${lifestyle.data?.workout_location || '?'} | Dụng cụ: ${lifestyle.data?.equipment_available || '?'}
- Budget: ${lifestyle.data?.budget_level || 'TB'}
- Bệnh lý: ${health.data?.health_condition || 'Không'} | Chấn thương: ${health.data?.injuries || 'Không'}
- Dị ứng: ${health.data?.allergies || 'Không'}

[TIẾN ĐỘ HÔM NAY ${today}]
${todayStatus}
${actionLog ? `[HỆ THỐNG VỪA THỰC HIỆN]\n${actionLog}` : ''}
[PHONG CÁCH TRẢ LỜI]
1. Trả lời chuyên nghiệp, thân thiện nhưng đi thẳng vào vấn đề.
2. CHỈ trả lời đúng câu hỏi được hỏi — không nhét thêm thông tin khác.
3. Nếu hệ thống vừa thực hiện hành động, xác nhận ngắn gọn rồi bổ sung lời khuyên nếu phù hợp.
4. Khi đề xuất bài tập / thực đơn, trình bày dạng danh sách rõ ràng.
5. Nhớ ngữ cảnh cuộc trò chuyện để trả lời liền mạch khi có câu hỏi liên tiếp.
6. Dùng emoji vừa phải cho sinh động. Tối đa 5-6 câu cho gợi ý, 1-3 câu cho câu hỏi ngắn.
7. Luôn cá nhân hóa dựa trên hồ sơ khách hàng ở trên.`;

        // Xây dựng messages array với lịch sử hội thoại
        const history = getHistory(chatId);
        const messages: { role: string; content: string }[] = [
          { role: 'system', content: systemPrompt },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ];

        if (!process.env.GROQ_API_KEY) {
          bot.sendMessage(chatId, 'Hệ thống chưa được cấp quyền AI. Vui lòng kiểm tra lại cấu hình.');
          return;
        }

        // Gửi cho Groq API (Llama 3.3 70B) với lịch sử hội thoại
        const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 1024
          })
        });

        const result = await apiResponse.json();
        if (result.error) throw new Error(result.error.message);
        const responseText = result.choices[0].message.content;

        // Lưu cả tin nhắn user và assistant vào bộ nhớ
        addToHistory(chatId, 'user', userMessage);
        addToHistory(chatId, 'assistant', responseText);

        // Gửi trả lời lại cho người dùng
        bot.sendMessage(chatId, responseText);

      } else {
        // Người dùng chưa liên kết tài khoản
        const guestSystemPrompt = `Bạn là "TrendFit AI" — Huấn luyện viên cá nhân & Chuyên gia dinh dưỡng của ứng dụng TrendFit.
Người dùng này CHƯA liên kết Telegram với tài khoản TrendFit.
Hãy trả lời thân thiện, chuyên nghiệp. Nếu họ hỏi về fitness/dinh dưỡng thì vẫn trả lời nhưng nhắc nhẹ rằng nên liên kết tài khoản để được cá nhân hóa tốt hơn.
Hướng dẫn: Vào web TrendFit → Cài đặt → Nhấn "Kết nối Telegram Bot".`;

        const history = getHistory(chatId);
        const messages: { role: string; content: string }[] = [
          { role: 'system', content: guestSystemPrompt },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ];

        if (!process.env.GROQ_API_KEY) {
          bot.sendMessage(chatId, 'Hệ thống chưa được cấp quyền AI.');
          return;
        }

        const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 512
          })
        });

        const result = await apiResponse.json();
        if (result.error) throw new Error(result.error.message);
        const responseText = result.choices[0].message.content;

        addToHistory(chatId, 'user', userMessage);
        addToHistory(chatId, 'assistant', responseText);

        bot.sendMessage(chatId, responseText);
      }

    } catch (err: any) {
      console.error('❌ Lỗi AI Telegram:', err.message);
      bot.sendMessage(chatId, 'Rất xin lỗi, hiện tại hệ thống AI đang bảo trì. Vui lòng thử lại sau ít phút nhé! 🔧');
    }
  });

  return bot;
};
