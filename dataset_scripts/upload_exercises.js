import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import translate from 'google-translate-api-x';
import pLimit from 'p-limit';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wpkbzssdipqtbmthvgvx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwa2J6c3NkaXBxdGJtdGh2Z3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2NTM5OSwiZXhwIjoyMDkxMDQxMzk5fQ.8n6yguYXvNprBif4IFPo6cVsRmPu1fJwRHWOHdQGPaY';
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'exercise_images';
const TABLE_NAME = 'exercises';

// This function downloads a file
async function downloadFile(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`);
    const fileStream = fs.createWriteStream(dest);
    return new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
}

async function main() {
    console.log("Downloading exercises.json...");
    const jsonUrl = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";
    const res = await fetch(jsonUrl);
    const exercises = await res.json();
    console.log(`Downloaded ${exercises.length} exercises.`);

    // 1. Setup Bucket
    console.log(`Checking bucket ${BUCKET_NAME}...`);
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.error("Bucket error:", bucketError);
        return;
    }
    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
        console.log(`Creating bucket ${BUCKET_NAME}...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        if (createError) {
            console.error("Create bucket error:", createError);
            return;
        }
    }

    // 2. Setup Database table (assuming the user will run a migration or we create it via postgres connection)
    // Supabase JS client doesn't create tables. We assume the table is created.
    // If not, it will fail and we'll tell the user to create it.
    
    // 3. Translate and format
    console.log("Translating text... this will take a while.");
    const limit = pLimit(10); // 10 concurrent requests
    
    const translatedExercises = [];
    let count = 0;
    
    await Promise.all(exercises.map(ex => limit(async () => {
        try {
            // Some entries might have null/undefined values
            const name = ex.name || '';
            const target = ex.target || '';
            const bodyPart = ex.body_part || '';
            const equipment = ex.equipment || '';
            const secMuscles = ex.secondary_muscles || [];
            
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
                name,
                target,
                bodyPart,
                equipment,
                ...secMuscles,
                ...instr
            ];
            
            const joinedText = stringsToTranslate.join(' ||| ');
            
            // Translate the joined text
            const translateRes = await translate(joinedText, { to: 'vi' });
            const translatedParts = translateRes.text.split(' ||| ').map(s => s.trim());
            
            const translatedEx = {
                id: ex.id,
                name: translatedParts[0] || name,
                target: translatedParts[1] || target,
                bodyPart: translatedParts[2] || bodyPart,
                category: ex.category || '',
                muscleGroup: ex.muscle_group || '',
                equipment: translatedParts[3] || equipment,
                image: ex.image || '',
                gifUrl: ex.gif_url || '',
                secondaryMuscles: translatedParts.slice(4, 4 + secMuscles.length),
                instructions: translatedParts.slice(4 + secMuscles.length)
            };
            
            // Re-assign correctly mapped fields
            if (ex.gifUrl) {
                // Actually, the dataset has images and videos, not necessarily just gifs.
                // The dataset json usually points to `ex.images` or `ex.gifUrl` depending on the version.
                // Let's preserve the original media URLs if we are not hosting them, 
                // OR we upload them. Wait, the git clone brings `images` and `videos`.
            }
            // For now, let's just log the keys of the first exercise to see its structure
            if (count === 0) {
                console.log("First exercise structure:", Object.keys(ex));
            }
            
            // Let's assume there is a local image corresponding to ex.id or we just download it.
            // Wait, we need to upload the images to Supabase first.
            // Actually, we can just point the image url to Supabase and upload them later.
            // Let's just do translation first.
            
            translatedExercises.push(translatedEx);
            count++;
            if (count % 50 === 0) console.log(`Translated ${count}/${exercises.length}`);
        } catch (e) {
            console.error(`Error translating exercise ${ex.id}:`, e.message);
            // push un-translated if it fails
            translatedExercises.push(ex);
        }
    })));

    console.log("Saving translated exercises to translated_exercises.json...");
    fs.writeFileSync('translated_exercises.json', JSON.stringify(translatedExercises, null, 2));

    console.log("Translation complete. Next steps: Uploading media and inserting to DB.");
}

main().catch(console.error);
