const nodemailer = require('nodemailer');

const emailUtility = async (options,next) => {

   try{
       const transporter = nodemailer.createTransport({
           service: 'gmail',
           auth: {
               user: "abdussjscript@gmail.com",
               pass: "rxfkwcfbudkkpgnl",
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
