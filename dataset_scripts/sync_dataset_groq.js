import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Groq } from 'groq-sdk';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wpkbzssdipqtbmthvgvx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwa2J6c3NkaXBxdGJtdGh2Z3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2NTM5OSwiZXhwIjoyMDkxMDQxMzk5fQ.8n6yguYXvNprBif4IFPo6cVsRmPu1fJwRHWOHdQGPaY';
const supabase = createClient(supabaseUrl, supabaseKey);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const BUCKET_NAME = 'exercise_images';
const TABLE_NAME = 'exercises';
const BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

const dictionary = {
    bodyParts: {
        "back": "Lưng", "cardio": "Cardio", "chest": "Ngực", "lower arms": "Cẳng tay",
        "lower legs": "Bắp chân", "neck": "Cổ", "shoulders": "Vai", "upper arms": "Bắp tay",
        "upper legs": "Đùi", "waist": "Eo/Bụng", "middle back": "Lưng giữa"
    },
    targetMuscles: {
        "abductors": "Cơ giạng", "abs": "Cơ bụng", "adductors": "Cơ khép", "biceps": "Cơ nhị đầu",
        "calves": "Cơ bắp chân", "cardiovascular system": "Hệ tim mạch", "delts": "Cơ vai",
        "forearms": "Cẳng tay", "glutes": "Cơ mông", "hamstrings": "Cơ đùi sau",
        "lats": "Cơ xô", "levator scapulae": "Cơ nâng vai", "pectorals": "Cơ ngực",
        "quads": "Cơ đùi trước", "serratus anterior": "Cơ răng cưa", "spine": "Cột sống",
        "traps": "Cơ thang", "triceps": "Cơ tam đầu", "upper back": "Lưng trên",
        "lower back": "Lưng dưới", "quadriceps": "Cơ đùi trước", "obliques": "Cơ liên sườn",
        "hip flexors": "Cơ gập hông", "groin": "Cơ háng", "chest": "Cơ ngực", "shoulders": "Cơ vai",
        "neck": "Cơ cổ", "middle back": "Lưng giữa"
    },
    equipments: {
        "assisted": "Có hỗ trợ", "band": "Dây đàn hồi", "barbell": "Tạ đòn", "body weight": "Không dụng cụ",
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

    console.log(`Checking bucket ${BUCKET_NAME}...`);
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
        await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }

    const BATCH_SIZE = 5; // Process 5 exercises per batch
    
    // Load existing progress to resume if stopped
    let finalExercises = [];
    if (fs.existsSync('final_groq_exercises.json')) {
        finalExercises = JSON.parse(fs.readFileSync('final_groq_exercises.json', 'utf8'));
        console.log(`Resuming from ${finalExercises.length} already processed exercises.`);
    }
    const processedIds = new Set(finalExercises.map(e => e.id));

    console.log("Starting processing: Groq Translation -> Media Upload -> Database Upsert");

    for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
        const batch = exercises.slice(i, i + BATCH_SIZE).filter(ex => !processedIds.has(ex.id));
        if (batch.length === 0) continue;

        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(exercises.length/BATCH_SIZE)}...`);

        // 1. Prepare Instructions and Names for Groq
        const dataMap = {};
        batch.forEach(ex => {
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
            dataMap[ex.id] = {
                name: ex.name || '',
                instructions: instr
            };
        });

        // 2. Ask Groq to Translate
        let translatedMap = null;
        try {
            const prompt = `You are a fitness expert. Translate the following English exercise names and instructions to natural Vietnamese. Output ONLY a valid JSON object matching the exact keys where each object contains the translated 'name' and 'instructions' array. Do not add any markdown like \`\`\`json or extra text.
            Input:
            ${JSON.stringify(dataMap, null, 2)}`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.1-8b-instant',
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            translatedMap = JSON.parse(completion.choices[0].message.content);
        } catch (error) {
            console.error(`Groq API Error on batch: ${error.message}`);
            console.log("Waiting 10 seconds before retrying...");
            await delay(10000);
            i -= BATCH_SIZE; // Retry this batch
            continue;
        }

        const dbRecordsToUpsert = [];

        // 3. Process the batch (Map Dictionary + Upload Media)
        for (const ex of batch) {
            const translatedData = translatedMap[ex.id] || dataMap[ex.id]; // fallback to EN if missing
            const translatedInstr = translatedData.instructions || dataMap[ex.id].instructions;
            const translatedName = translatedData.name || dataMap[ex.id].name;
            
            // Map specific fitness terms from dictionary
            const bodyPart = ex.body_part || ex.bodyPart || '';
            const equipment = ex.equipment || '';
            const target = ex.target || '';
            const secMuscles = ex.secondary_muscles || ex.secondaryMuscles || [];

            const translatedBodyPart = dictionary.bodyParts[bodyPart.toLowerCase()] || bodyPart;
            const translatedEquipment = dictionary.equipments[equipment.toLowerCase()] || equipment;
            const translatedTarget = dictionary.targetMuscles[target.toLowerCase()] || target;
            const translatedSecMuscles = secMuscles.map(m => dictionary.targetMuscles[m.toLowerCase()] || m);

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
                        if (!uploadError) finalImage = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${imgName}`;
                    }
                } catch(e) {}
            }

            if (ex.gif_url && ex.gif_url.startsWith('videos/')) {
                const gifName = path.basename(ex.gif_url);
                const gifUrl = BASE_URL + ex.gif_url;
                try {
                    const gifRes = await fetch(gifUrl);
                    if (gifRes.ok) {
                        const gifBuffer = await gifRes.arrayBuffer();
                        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(gifName, gifBuffer, { contentType: 'image/gif', upsert: true });
                        if (!uploadError) finalGif = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${gifName}`;
                    }
                } catch(e) {}
            }

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
            dbRecordsToUpsert.push(dbRecord);
        }

        // Save progress to file
        fs.writeFileSync('final_groq_exercises.json', JSON.stringify(finalExercises, null, 2));

        // Upsert to Supabase
        const { error: upsertError } = await supabase.from(TABLE_NAME).upsert(dbRecordsToUpsert);
        if (upsertError) {
            console.error(`Database Error for batch: ${upsertError.message}`);
        } else {
            console.log(`  Uploaded ${dbRecordsToUpsert.length} records to Supabase.`);
        }

        // Delay to respect rate limits (Groq allows 30 req/min, so waiting ~2.5s is extremely safe)
        await delay(3000);
    }

    console.log("All done! Sync completed successfully with Groq AI Translation.");
}

main().catch(console.error);
