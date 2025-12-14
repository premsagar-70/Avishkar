const { uploadToGitHub } = require('../services/githubService');

const uploadImage = async (req, res) => {
    try {
        const { image, folder } = req.body;

        console.log(`[Upload] Request received. Folder: ${folder}, Image length: ${image ? image.length : 'N/A'}`);

        if (!image) {
            console.error('[Upload] No image provided');
            return res.status(400).json({ error: 'No image provided' });
        }

        const imageUrl = await uploadToGitHub(image, folder || 'events');
        console.log(`[Upload] Success: ${imageUrl}`);

        res.status(200).json({ url: imageUrl });
    } catch (error) {
        console.error('[Upload] Controller Error:', error.message);
        // Try to parse status code from error message if possible, or default to 500
        const statusCode = error.message.includes('403') ? 403 :
            error.message.includes('404') ? 404 : 500;
        res.status(statusCode).json({ error: error.message });
    }
};

module.exports = { uploadImage };
