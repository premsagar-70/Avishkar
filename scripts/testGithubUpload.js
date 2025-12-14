const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const uploadToGitHub = async () => {
    try {
        const token = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_REPO_OWNER;
        const repo = process.env.GITHUB_REPO_NAME;

        console.log('Config:', {
            token: token ? 'Present' : 'Missing',
            owner,
            repo
        });

        if (!token || !owner || !repo) {
            throw new Error('Missing configuration');
        }

        const fileName = `test-${Date.now()}.txt`;
        const content = Buffer.from('Hello World Test').toString('base64');
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/test/${fileName}`;

        console.log('Uploading to:', url);

        const response = await axios.put(url, {
            message: 'Test upload',
            content: content
        }, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Aviskhar-App' // GitHub API requires User-Agent
            }
        });

        console.log('Upload successful!');
        console.log('Download URL:', response.data.content.download_url);

    } catch (error) {
        console.error('Upload Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
};

uploadToGitHub();
