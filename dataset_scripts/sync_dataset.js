import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import translate from 'google-translate-api-x';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wpkbzssdipqtbmthvgvx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwa2J6c3NkaXBxdGJtdGh2Z3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2NTM5OSwiZXhwIjoyMDkxMDQxMzk5fQ.8n6yguYXvNprBif4IFPo6cVsRmPu1fJwRHWOHdQGPaY';
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'exercise_images';
const TABLE_NAME = 'exercises';
const BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

const dictionary = {
    bodyParts: {
        "back": "Lưng", "cardio": "Cardio", "chest": "Ngực", "lower arms": "Cẳng tay",
        "lower legs": "Bắp chân", "neck": "Cổ", "shoulders": "Vai", "upper arms": "Bắp tay",
        "upper legs": "Đùi", "waist": "Eo/Bụng"
    },
    targetMuscles: {
        "abductors": "Cơ giạng", "abs": "Cơ bụng", "adductors": "Cơ khép", "biceps": "Cơ nhị đầu (Biceps)",
        "calves": "Cơ bắp chân (Calves)", "cardiovascular system": "Hệ tim mạch", "delts": "Cơ vai (Delts)",
        "forearms": "Cẳng tay", "glutes": "Cơ mông (Glutes)", "hamstrings": "Cơ đùi sau (Hamstrings)",
        "lats": "Cơ xô (Lats)", "levator scapulae": "Cơ nâng vai", "pectorals": "Cơ ngực (Pecs)",
        "quads": "Cơ đùi trước (Quads)", "serratus anterior": "Cơ răng cưa", "spine": "Cột sống",
        "traps": "Cơ thang (Traps)", "triceps": "Cơ tam đầu (Triceps)", "upper back": "Lưng trên"
    },
    equipments: {
        "assisted": "Có hỗ trợ", "band": "Dây đàn hồi", "barbell": "Tạ đòn", "body weight": "Trọng lượng cơ thể (Bodyweight)",
        "bosu ball": "Bóng Bosu", "cable": "Máy kéo cáp", "dumbbell": "Tạ đơn", "elliptical machine": "Máy hình elip",
        "ez barbell": "Tạ đòn EZ", "hammer": "Búa tạ", "kettlebell": "Tạ ấm", "leverage machine": "Máy tập đòn bẩy",
        "medicine ball": "Bóng tạ", "olympic barbell": "Tạ đòn Olympic", "resistance band": "Dây kháng lực",
        "roller": "Con lăn", "rope": "Dây thừng", "skierg machine": "Máy Skierg", "sled machine": "Máy đẩy xe trượt",
        "smith machine": "Máy Smith", "stability ball": "Bóng tập thăng bằng", "stationary bike": "Xe đạp tập",
        "stepmill machine": "Máy tập leo cầu thang", "tire": "Lốp xe", "trap bar": "Tạ đòn lục giác",
        "upper body ergometer": "Máy tập tay quay", "weight": "Tạ", "wheel roller": "Con lăn tập bụng"
    }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    console.log("Downloading exercises.json...");
    const jsonUrl = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";
    const res = await fetch(jsonUrl);
    const exercises = await res.json();
    console.log(`Downloaded ${exercises.length} exercises.`);

    // Setup Bucket
    console.log(`Checking bucket ${BUCKET_NAME}...`);
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
        console.log(`Creating bucket ${BUCKET_NAME}...`);
        await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }

    console.log("Starting processing: Translation -> Media Upload -> Database Upsert");
    console.log("This will take approximately 1.5 - 2 hours due to rate limits. Please keep this terminal running.");

    const finalExercises = [];
    
    // We process sequentially to avoid rate limits
    for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        try {
            console.log(`Processing ${i + 1}/${exercises.length}: ${ex.name}`);

            // 1. Prepare fields for translation
            const name = ex.name || '';
            const target = ex.target || '';
            const bodyPart = ex.body_part || ex.bodyPart || '';
            const equipment = ex.equipment || '';
            const secMuscles = ex.secondary_muscles || ex.secondaryMuscles || [];
            
            let instr = [];
            if (ex.instruction_steps && ex.instruction_steps.en) {
                instr = ex.instruction_steps.en;
            } else if (ex.instructions && ex.instructions.en) {
                instr = [ex.instructions.en];
            } else if (Array.isArray(ex.instructions)) {
                instr = ex.instructions;
            } else if (typeof ex.instructions === 'string') {
                instr = [ex.instructions];
            }

            const stringsToTranslate = [
                ...instr
            ];
            
            const joinedText = stringsToTranslate.join(' ||| ');
            
            // 2. Translate with delay to prevent rate limit
            let translatedParts = stringsToTranslate; // fallback to english
            try {
                if (stringsToTranslate.length > 0) {
                    const translateRes = await translate(joinedText, { to: 'vi', forceBatch: false });
                    translatedParts = translateRes.text.split(' ||| ').map(s => s.trim());
                }
            } catch (tError) {
                console.log(`  Translation failed for ${ex.id}, using English fallback. Reason: ${tError.message}`);
                // if it fails, we just keep the english parts
            }
            
            // Map specific fitness terms from dictionary, keep Name in English
            const translatedName = name; // Giữ nguyên tên tiếng Anh
            const translatedTarget = dictionary.targetMuscles[target.toLowerCase()] || target;
            const translatedBodyPart = dictionary.bodyParts[bodyPart.toLowerCase()] || bodyPart;
            const translatedEquipment = dictionary.equipments[equipment.toLowerCase()] || equipment;
            const translatedSecMuscles = secMuscles.map(m => dictionary.targetMuscles[m.toLowerCase()] || m);
            const translatedInstr = translatedParts;

            // 3. Download and Upload Media
            let finalImage = null;
            let finalGif = null;

            if (ex.image && ex.image.startsWith('images/')) {
                const imgName = path.basename(ex.image);
                const imgUrl = BASE_URL + ex.image;
                try {
                    const imgRes = await fetch(imgUrl);
                    if (imgRes.ok) {
                        const imgBuffer = await imgRes.arrayBuffer();
                        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(imgName, imgBuffer, { contentType: 'image/jpeg', upsert: true });
                        if (!uploadError) {
                            finalImage = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${imgName}`;
                        }
                    }
                } catch(e) { console.log(`  Failed to upload image for ${ex.id}`); }
            }

            if (ex.gif_url && ex.gif_url.startsWith('videos/')) {
                const gifName = path.basename(ex.gif_url);
                const gifUrl = BASE_URL + ex.gif_url;
                try {
                    const gifRes = await fetch(gifUrl);
                    if (gifRes.ok) {
                        const gifBuffer = await gifRes.arrayBuffer();
                        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(gifName, gifBuffer, { contentType: 'image/gif', upsert: true });
                        if (!uploadError) {
                            finalGif = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${gifName}`;
                        }
                    }
                } catch(e) { console.log(`  Failed to upload gif for ${ex.id}`); }
            }

            // 4. Construct DB Record to match the schema
            const dbRecord = {
                id: ex.id,
                name: translatedName,
                body_part: translatedBodyPart,
                equipment: translatedEquipment,
                target_muscle: translatedTarget,
                gif_url: finalGif,
                image_url: finalImage,
                secondary_muscles: translatedSecMuscles,
                instructions: translatedInstr
            };

            finalExercises.push(dbRecord);
            
            // Periodically save to file to prevent data loss
            if (i % 20 === 0) {
                fs.writeFileSync('sync_backup.json', JSON.stringify(finalExercises, null, 2));
            }

            // 5. Upsert to DB immediately so user can see progress
            await supabase.from(TABLE_NAME).upsert([dbRecord]);

            // Wait 4.5 seconds before the next request to respect rate limits
            await delay(4500);

        } catch (e) {
            console.error(`Unexpected error processing exercise ${ex.id}:`, e.message);
        }
    }

    console.log("Saving final results...");
    fs.writeFileSync('final_synced_exercises.json', JSON.stringify(finalExercises, null, 2));
    console.log("All done! Sync completed successfully.");
}

main().catch(console.error);
