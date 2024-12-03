import AWS from 'aws-sdk';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file data as a buffer
 * @param {string} fileName - The name of the file in S3
 * @returns {Promise} - A promise resolving to the S3 upload result
 */
// In S3Uploader.js
const uploadFileToS3 = async (fileBuffer, fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
  };
//UPLOAD S3
  try {
    console.log('S3 Upload Attempt:', {
      Bucket: params.Bucket,
      Key: params.Key,
      BufferLength: fileBuffer.length
    });

    const result = await s3.upload(params).promise();
    console.log('S3 Upload Success:', result.Location);
    return result;
  } catch (error) {
    console.error('Detailed S3 Upload Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

export default uploadFileToS3;
