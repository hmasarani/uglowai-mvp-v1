import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs/promises';
import heicConvert from 'heic-convert';

async function convertHeicToJpeg(buffer) {
  try {
    const jpegBuffer = await heicConvert({
      buffer: buffer,
      format: 'JPEG',
      quality: 0.9
    });
    console.log('HEIC conversion successful using heic-convert');
    return jpegBuffer;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw error;
  }
}

async function convertImage(buffer) {
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    console.log('Detected file type:', fileType);

    if (fileType && (fileType.ext === 'heic' || fileType.ext === 'heif')) {
      console.log('Converting HEIC/HEIF to JPEG...');
      try {
        const jpegBuffer = await sharp(buffer)
          .toFormat('jpeg')
          .toBuffer();
        console.log('Conversion successful using Sharp. JPEG size:', jpegBuffer.length);
        return jpegBuffer;
      } catch (sharpError) {
        console.error('Sharp conversion failed, trying heic-convert:', sharpError);
        return await convertHeicToJpeg(buffer);
      }
    }

    console.log('No conversion needed. Original buffer size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('Error during conversion:', error);
    throw error;
  }
}

async function testImageConversion(filePath) {
  try {
    console.log('Reading file:', filePath);
    const fileBuffer = await fs.readFile(filePath);
    console.log('File read successfully. Size:', fileBuffer.length);

    const convertedBuffer = await convertImage(fileBuffer);
    console.log('Conversion process completed.');

    // Here you would typically upload to S3, but for testing, we'll just log the result
    console.log('Final buffer size:', convertedBuffer.length);

    // Save the converted image for verification
    const outputPath = `${filePath.split('.')[0]}_converted.jpg`;
    await fs.writeFile(outputPath, convertedBuffer);
    console.log('Converted image saved to:', outputPath);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Replace 'path/to/your/image.heic' with the actual path to a test image from your iPhone
testImageConversion('IMG_2643.heic');

