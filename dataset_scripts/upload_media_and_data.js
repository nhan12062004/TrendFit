import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wpkbzssdipqtbmthvgvx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwa2J6c3NkaXBxdGJtdGh2Z3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2NTM5OSwiZXhwIjoyMDkxMDQxMzk5fQ.8n6yguYXvNprBif4IFPo6cVsRmPu1fJwRHWOHdQGPaY';
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'exercise_images';
const TABLE_NAME = 'exercises';
const BASE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

async function main() {
    console.log("Reading translated_exercises.json...");
    if (!fs.existsSync('translated_exercises.json')) {
        console.error("translated_exercises.json not found!");
        return;
    }
    const rawData = fs.readFileSync('translated_exercises.json', 'utf-8');
    const exercises = JSON.parse(rawData);
    console.log(`Loaded ${exercises.length} translated exercises.`);

    // Check table
    console.log(`Verifying table ${TABLE_NAME}...`);
    // Note: We can't easily check table existence in Supabase JS without doing a select.
    // Let's try to fetch 1 row.
    const { error: tableError } = await supabase.from(TABLE_NAME).select('id').limit(1);
    if (tableError) {
        console.log(`WARNING: Table error. You might need to create the table "${TABLE_NAME}" first. Error:`, tableError.message);
        // We'll continue anyway, maybe it just failed because of RLS (though service key bypasses RLS).
    }

    const limit = pLimit(10); // 10 concurrent requests
    let count = 0;
    
    // We will download/upload images and update the database objects
    const finalExercises = [];

    await Promise.all(exercises.map(ex => limit(async () => {
        try {
            let finalImage = ex.image;
            let finalGif = ex.gifUrl;
            
            // Upload Image
            if (ex.image && ex.image.startsWith('images/')) {
                const imgName = path.basename(ex.image);
                const imgUrl = BASE_URL + ex.image;
                
                // Download
                const imgRes = await fetch(imgUrl);
                if (imgRes.ok) {
                    const imgBuffer = await imgRes.arrayBuffer();
                    // Upload to Supabase
                    const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(imgName, imgBuffer, { contentType: 'image/jpeg', upsert: true });
                    if (!uploadError) {
                        finalImage = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${imgName}`;
                    } else {
                        console.error(`Error uploading image ${imgName}:`, uploadError.message);
                    }
                }
            }
            
            // Upload Gif (which is in videos folder as a .gif)
            if (ex.gifUrl && ex.gifUrl.startsWith('videos/')) {
                const gifName = path.basename(ex.gifUrl);
                const gifUrl = BASE_URL + ex.gifUrl;
                
                // Download
                const gifRes = await fetch(gifUrl);
                if (gifRes.ok) {
                    const gifBuffer = await gifRes.arrayBuffer();
                    // Upload to Supabase
                    const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(gifName, gifBuffer, { contentType: 'image/gif', upsert: true });
                    if (!uploadError) {
                        finalGif = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${gifName}`;
                    } else {
                        console.error(`Error uploading gif ${gifName}:`, uploadError.message);
                    }
                }
            }

            const dbRecord = {
                id: ex.id,
                name: ex.name,
                category: ex.category,
                target: ex.target,
                bodyPart: ex.bodyPart,
                equipment: ex.equipment,
                muscleGroup: ex.muscleGroup,
                image: finalImage,
                gifUrl: finalGif,
                secondaryMuscles: ex.secondaryMuscles,
                instructions: ex.instructions
            };
            
            finalExercises.push(dbRecord);
            count++;
            if (count % 50 === 0) console.log(`Processed media for ${count}/${exercises.length} exercises`);
        } catch (e) {
            console.error(`Error processing exercise ${ex.id}:`, e.message);
        }
    })));

    console.log("Saving final_exercises.json...");
    fs.writeFileSync('final_exercises.json', JSON.stringify(finalExercises, null, 2));

    console.log(`Uploading ${finalExercises.length} records to Supabase table ${TABLE_NAME}...`);
    // Let's upsert in batches of 100 to avoid request size limits
    const BATCH_SIZE = 100;
    for (let i = 0; i < finalExercises.length; i += BATCH_SIZE) {
        const batch = finalExercises.slice(i, i + BATCH_SIZE);
        const { error: dbError } = await supabase.from(TABLE_NAME).upsert(batch);
        if (dbError) {
            console.error(`Database upload error for batch ${i}-${i + BATCH_SIZE}:`, dbError);
        } else {
            console.log(`Successfully uploaded batch ${i}-${i + BATCH_SIZE}`);
        }
    }
    
    console.log("All done!");
}

main().catch(console.error);
