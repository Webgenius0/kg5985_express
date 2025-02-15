const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Set up the upload directory

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
console.log("uploadDir",uploadDir);
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg');
    },
});

// // File filter to allow only JPG/JPEG formats
// const fileFilter = (req, file, cb) => {
//     if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
//         cb(null, true); // Accept file
//     } else {
//         cb(new Error('Only JPG or JPEG files are allowed!'), false);
//     }
// };

// Multer setup with storage and file filter
// const upload = multer({ storage: storage, fileFilter: fileFilter });
const upload = multer({ storage: storage});

// Middleware to resize images after upload
const resizeImages = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return next(); // No files to resize
    }

    try {
        await Promise.all(
            req.files.map(async (file) => {
                const originalFilePath = path.join(uploadDir, file.filename);

                // Path for the resized larger display image (693x482)
                const displayFilePath = path.join(uploadDir, `display-${file.filename}`);

                // Generate the larger display image (693x482)
                const displayBuffer = await sharp(originalFilePath)
                    .resize(693, 482, { fit: 'cover' })
                    .toBuffer();
                fs.writeFileSync(displayFilePath, displayBuffer);

                // Function to try deleting the file with retries
                const deleteWithRetry = async (filePath, retries = 5) => {
                    for (let i = 0; i < retries; i++) {
                        try {
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                            break;
                        } catch (error) {
                            if (error.code === 'EPERM' || error.code === 'EBUSY') {
                                await new Promise((resolve) => setTimeout(resolve, 100)); // Retry after 100ms
                            } else {
                                console.error('Error deleting file:', error);
                                break;
                            }
                        }
                    }
                };

                // Attempt to delete the original file after processing
                await deleteWithRetry(originalFilePath);

                // Update file paths in req.files to include only the resized display version
                file.displayImage = displayFilePath;
            }),
        );

        next();
    } catch (error) {
        console.error('Error resizing images:', error);
        return res.status(500).json({ status: 'failed', message: 'Failed to resize images' });
    }
};

module.exports = { upload, resizeImages };