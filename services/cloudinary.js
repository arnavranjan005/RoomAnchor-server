const {v2}=require('cloudinary');
const fs=require('fs');
const { userAuth } = require('../auth/userAuth');
const { redis } = require('../DB/connection');

v2.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const uploadImg_Cloudinary=async(filePath)=>{
    try{

        const result=await v2.uploader.upload(filePath,{
            resource_type:'auto'
        });
        fs.unlink(filePath,(err)=>{
            console.log(err);
        });
        console.log(result.url);
        
        return {url:result.url};
    }catch(e){
        console.log(e.message);
        
        fs.unlink(filePath,(err)=>{
            console.log(err);
            
        });
        return e.message;
    }
}

module.exports={
    uploadImg_Cloudinary
}