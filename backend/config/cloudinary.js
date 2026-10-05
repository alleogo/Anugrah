import { v2 as cloudinary } from "cloudinary";

const ROOT_FOLDER = "anugrah";

for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
  if (!process.env[key]) {
    throw new Error(`${key} is missing in backend/.env. Cloudinary is required for image and video storage.`);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Upload an image or video (data URI, URL or file path) and return its URL.
// `folder` is placed under the "anugrah/" root folder.
export const uploadMedia = async (file, { folder, publicId, transformation } = {}) => {
  const result = await cloudinary.uploader.upload(file, {
    folder: `${ROOT_FOLDER}/${folder}`,
    public_id: publicId,
    overwrite: Boolean(publicId),
    invalidate: Boolean(publicId),
    resource_type: "auto", // detects image or video
    transformation,
  });
  return result.secure_url;
};

// Each user has one avatar file (avatars/<userId>), so a new upload replaces the old one.
export const uploadAvatar = (dataUri, userId) =>
  uploadMedia(dataUri, {
    folder: "avatars",
    publicId: String(userId),
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  });

export const deleteAvatar = (userId) =>
  cloudinary.uploader.destroy(`${ROOT_FOLDER}/avatars/${userId}`, { invalidate: true });
