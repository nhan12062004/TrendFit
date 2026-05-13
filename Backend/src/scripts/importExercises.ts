import axios from 'axios';
import { supabase } from '../config/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Đảm bảo load env từ đúng thư mục backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = 'exercisedb.p.rapidapi.com';

async function sniperNewExercises() {
    const MAX_REQUESTS = 200; // Giới hạn số lần gọi lần này để giữ an toàn
    console.log(`🎯 Bắt đầu chiến dịch "Bắn tỉa" - Mục tiêu: ${MAX_REQUESTS} bài tập mới.`);

    try {
        // 1. Lấy danh sách ID đã có trong DB
        const { data: existing, error: fetchError } = await supabase
            .from('exercises')
            .select('id');
        
        if (fetchError) throw fetchError;
        
        const existingIds = new Set(existing.map(ex => ex.id));
        console.log(`📦 Hiện đang có ${existingIds.size} bài trong hệ thống.`);

        let count = 0;
        let idNumber = 1;

        // 2. Lặp qua các ID tiềm năng (0001 - 1500)
        while (count < MAX_REQUESTS && idNumber <= 1500) {
            const currentId = idNumber.toString().padStart(4, '0');
            
            // Nếu ID này chưa có trong DB thì mới gọi API
            if (!existingIds.has(currentId)) {
                console.log(`📡 Đang bắn tỉa ID: ${currentId}...`);
                try {
                    const response = await axios.get(`https://exercisedb.p.rapidapi.com/exercises/exercise/${currentId}`, {
                        headers: { 'X-RapidAPI-Key': RAPID_API_KEY, 'X-RapidAPI-Host': RAPID_API_HOST }
                    });

                    const ex = response.data;
                    if (ex && ex.id) {
                        const formatted = {
                            id: ex.id,
                            name: ex.name,
                            body_part: ex.bodyPart,
                            equipment: ex.equipment,
                            target_muscle: ex.target,
                            gif_url: `http://d205bpvrqc9yn1.cloudfront.net/${ex.id}.gif`,
                            instructions: ex.instructions || []
                        };

                        const { error: insertError } = await supabase
                            .from('exercises')
                            .insert(formatted);

                        if (!insertError) {
                            count++;
                            console.log(`✅ Đã thêm mới: ${ex.name} (Bài tập thứ ${count}/${MAX_REQUESTS} đợt này)`);
                        }
                    }
                } catch (e: any) {
                    if (e.response?.status === 429) {
                        console.error('🛑 CẢNH BÁO: Đã chạm ngưỡng giới hạn của tháng này! Tạm dừng tại đây.');
                        break;
                    }
                    console.warn(`⚠️ Bỏ qua ID ${currentId} (Có thể ID này không tồn tại).`);
                }
                
                // Nghỉ 1 chút giữa các lần gọi
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            idNumber++;
        }

        console.log(`\n🎉 CHIẾN DỊCH KẾT THÚC! Bạn đã mang về thêm ${count} bài tập mới.`);
        console.log(`📲 Tổng số bài tập hiện tại trong DB: ${existingIds.size + count}`);
    } catch (error: any) {
        console.error('❌ Lỗi hệ thống:', error.message);
    }
}

// Chạy script bắn tỉa
sniperNewExercises();
