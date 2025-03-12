const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMG_KIT_URL,
  publicKey: process.env.IMG_KIT_PUB_KEY,
  privateKey: process.env.IMG_KIT_PRIVATE_KEY
});

module.exports={imagekit};