const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const ApiError = require("../utils/ApiError");
const { extractPublicId } = require("cloudinary-build-url");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath , folder = "") => {
    if (!localFilePath) return null;

    try {
        return await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder,
        });
    } catch (error) {
        throw new ApiError(502, 'Cloudinary upload failed');
    } finally {
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (error) {
            console.warn('Could not remove temporary upload file.');
        }
    }
}

const deleteOnCloudinary = async (imageURL) => {
    try {
        if (!imageURL) {
            throw new ApiError(404, "Image Invalid")
        }
        const publicId = extractPublicId(imageURL);
        const resourceType = imageURL.includes("/video/")
            ? "video"
            : "image";
        
        const response = await cloudinary.uploader.destroy(publicId ,{
            resource_type: resourceType
        });
        if(response.result != 'ok'){
            throw new ApiError(404, "Old Image Deletion Failed from Cloudinary")
        }

        return 1;

    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(502, 'Cloudinary image deletion failed');
    }
}



const replaceOnCloudinary = async (localFilePath, oldFileUrl, folder = "") => {

    if (!(localFilePath && oldFileUrl)) {
        throw new ApiError(401,"old and new file path is requierd")
    }
    const newFile = await uploadOnCloudinary(localFilePath, folder);
    if (!newFile?.url) { 
        throw new ApiError(401,"new file is not upload")
    };

    const deletefile =  await deleteOnCloudinary(oldFileUrl);
    
    return newFile;
};

module.exports = {
    uploadOnCloudinary,
    deleteOnCloudinary,
    replaceOnCloudinary
};