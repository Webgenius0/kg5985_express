const nodemailer = require('nodemailer');

const emailUtility = async (options,next) => {

   try{
       const transporter = nodemailer.createTransport({
           service: 'gmail',
           auth: {
               user: process.env.EMAIL_USER,
               pass: process.env.EMAIL_PASS,
           },
       });

       await transporter.sendMail(options);
       return true;
   }
   catch(error){
       next(error);
   }
};

module.exports = emailUtility;
