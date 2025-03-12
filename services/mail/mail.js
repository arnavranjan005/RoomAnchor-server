const {createTransport} = require('nodemailer');

let transporter =createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ADMINGMAIL,
      pass: process.env.APPPASSWORD
    }
  });

function sendEmail(mailOptions) {
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error:', error);
      throw new Error(`Error :${error}`);
      
    } else {
      console.log('Email sent:', info.response);
      return `Email sent:${info.response}`;
    }
  });
  
}

module.exports={sendEmail};