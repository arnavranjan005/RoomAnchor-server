const multer = require("multer");
const fs=require('fs');

const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        const dir = './temp';
        fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) return cb(err);
            cb(null, dir);
        });
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+file.originalname)
    }
});


const uploadProfile=multer({
    storage,
    limits:{fileSize:9*1024*1024},
    fileFilter:(req,file,cb)=>{
    const allowedTypes = /\.(jpe?g|png|svg)$/i;
    if (allowedTypes.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }}
});

const upload=multer({
    storage,
    limits:{fileSize:9*1024*1024},
    fileFilter:(req,file,cb)=>{
    const allowedTypes = /\.(jpe?g|png|gif|svg|mp4|webm|ogg|mp3|wav|pdf|docx?|xlsx?|pptx?|txt)$/i;
    if (allowedTypes.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }}
});

module.exports={upload,uploadProfile};