const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const ApiError = require("../utils/ApiError");
const { extractPublicId } = require("cloudinary-build-url");
const { log } = require("console");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath , folder = "") => {
    try {
        if (!localFilePath) return null 

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: folder 
        })
        // console.log("cloudinary response",response);


        fs.unlinkSync(localFilePath);
        return response
        
    } catch (error) {
        fs.unlinkSync(localFilePath) 
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
        }
        return null

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
        throw new ApiError(400,"cloudinary delete catch block");
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