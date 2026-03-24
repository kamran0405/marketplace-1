// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: isVideo ? 'marketplace_chat_videos' : isImage ? 'marketplace_products' : 'marketplace_files',
      resource_type: isVideo ? 'video' : 'auto',
      allowed_formats: isImage
        ? ['jpg', 'jpeg', 'png', 'webp', 'gif']
        : isVideo
        ? ['mp4', 'mov', 'avi', 'webm']
        : undefined,
      transformation: isImage ? [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }] : undefined,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

module.exports = { cloudinary, upload };