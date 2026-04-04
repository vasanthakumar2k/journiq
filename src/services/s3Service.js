import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { AWS_CONFIG } from './awsConfig';

const s3Client = new S3Client({
    region: AWS_CONFIG.region,
    credentials: {
        accessKeyId: AWS_CONFIG.accessKeyId,
        secretAccessKey: AWS_CONFIG.secretAccessKey,
    },
});

/**
 * Uploads a file to S3 and returns the URL.
 * @param {string} fileUri - Local file path (used as fallback).
 * @param {string} fileName - Destination file name in S3.
 * @param {string} mimeType - MIME type of the file.
 * @param {string} base64Data - Base64 encoded file data (preferred).
 * @returns {Promise<string>} - S3 URL of the uploaded file.
 */
export const uploadToS3 = async (fileUri, fileName, mimeType = 'image/jpeg', base64Data = null) => {
    try {
        let body;

        if (base64Data) {
            console.log("Preparing S3 upload using Base64 data");
            // Convert base64 to Buffer then Uint8Array
            const buffer = Buffer.from(base64Data, 'base64');
            body = new Uint8Array(buffer);
        } else {
            console.log("Preparing S3 upload using local URI (fallback):", fileUri);
            // Use XMLHttpRequest to get the blob from a local URI (fallback)
            body = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = function (e) {
                    console.error("XHR failed for URI:", fileUri, e);
                    reject(new TypeError("Network request failed (Local File Read)"));
                };
                xhr.responseType = 'blob';
                xhr.open('GET', fileUri, true);
                xhr.send(null);
            });
        }

        const params = {
            Bucket: AWS_CONFIG.bucketName,
            Key: `journals/${Date.now()}_${fileName}`,
            Body: body,
            ContentType: mimeType,
        };

        console.log("Sending to S3 with Params:", { Bucket: params.Bucket, Key: params.Key, ContentType: params.ContentType });
        const command = new PutObjectCommand(params);
        await s3Client.send(command);

        // Construct the public URL
        const s3Url = `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${params.Key}`;
        console.log("Uploaded successfully to S3:", s3Url);
        return s3Url;
    } catch (error) {
        console.error("CRITICAL S3 ERROR:", error);
        if (error.$metadata) {
            console.error("AWS Error Metadata:", JSON.stringify(error.$metadata));
        }
        throw error;
    }
};

/**
 * Uploads multiple images to S3.
 * @param {Array<{uri: string, fileName: string}>} images 
 * @returns {Promise<Array<string>>} - Array of S3 URLs.
 */
export const uploadMultipleToS3 = async (images) => {
    const uploadPromises = images.map((img, index) => 
        uploadToS3(img.uri, img.fileName || `image_${index}.jpg`)
    );
    return Promise.all(uploadPromises);
};
