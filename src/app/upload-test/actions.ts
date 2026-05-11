"use server";

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * @fileOverview Server actions for the developer sound upload utility.
 */
export async function uploadSound(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { error: 'No file provided' };

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Standard public path for Next.js assets
    const soundsDir = join(process.cwd(), 'public', 'sounds');
    
    // Ensure directory exists (mkdir with recursive: true is idempotent)
    await mkdir(soundsDir, { recursive: true });

    // Save as hover.wav as requested
    const filePath = join(soundsDir, 'hover.wav');
    await writeFile(filePath, buffer);

    console.log(`Sound file saved successfully: ${filePath}`);
    return { success: true };
  } catch (error: any) {
    console.error('Upload Error:', error);
    return { error: error.message || 'Internal server error during upload.' };
  }
}
