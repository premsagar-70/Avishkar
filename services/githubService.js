const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const uploadToGitHub = async (base64Image, folder = 'events') => {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GitHub token is not configured');
        }

        // Remove header if present (e.g., "data:image/jpeg;base64,")
        const base64Content = base64Image.replace(/^data:image\/\w+;base64,/, "");

        const fileName = `${uuidv4()}.jpg`; // Assuming jpg for simplicity, can be dynamic
        const path = `assets/${folder}/${fileName}`;
        const message = `Upload image ${fileName}`;

        // GitHub API requires owner and repo name. 
        // Ideally these should also be in env or passed in.
        // For now, I'll use placeholders or extract from a config.
        // Let's assume the user will provide REPO_OWNER and REPO_NAME in env as well.
        const owner = process.env.GITHUB_REPO_OWNER;
        const repo = process.env.GITHUB_REPO_NAME;

        if (!owner || !repo) {
            throw new Error('GitHub repository details are not configured');
        }

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

        const response = await axios.put(url, {
            message: message,
            content: base64Content
        }, {
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Aviskhar-App'
            }
        });

        // Return the raw URL or the download URL
        // Raw URL format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
        // We can construct it or use the one from response
        const downloadUrl = response.data.content.download_url;
        return downloadUrl;

    } catch (error) {
        console.error('GitHub Upload Error Details:', {
            message: error.message,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data
            } : 'No response data',
            config: error.config ? {
                url: error.config.url,
                method: error.config.method,
                headers: { ...error.config.headers, Authorization: 'HIDDEN' } // Hide token in logs
            } : 'No config'
        });
        throw new Error(`Failed to upload image to GitHub: ${error.response?.data?.message || error.message}`);
    }
};

const deleteFromGitHub = async (imageUrl) => {
    try {
        const token = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_REPO_OWNER;
        const repo = process.env.GITHUB_REPO_NAME;

        if (!token || !owner || !repo) {
            console.warn('GitHub credentials not configured, skipping image deletion');
            return;
        }

        // Extract path from URL
        // URL format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
        // or https://github.com/{owner}/{repo}/raw/{branch}/{path}
        // We need to extract {path}

        // Simple heuristic: split by repo name and take the part after 'main/' or 'master/'
        // This is a bit brittle, a better way is to store the path in DB.
        // For now, let's try to parse it.

        let path = '';
        if (imageUrl.includes(`raw.githubusercontent.com/${owner}/${repo}`)) {
            const parts = imageUrl.split(`raw.githubusercontent.com/${owner}/${repo}/`)[1].split('/');
            // parts[0] is branch, rest is path
            path = parts.slice(1).join('/');
        } else {
            console.warn('Could not parse GitHub URL for deletion:', imageUrl);
            return;
        }

        // 1. Get file SHA
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const getResponse = await axios.get(getUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Aviskhar-App'
            }
        });
        const sha = getResponse.data.sha;

        // 2. Delete file
        await axios.delete(getUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Aviskhar-App'
            },
            data: {
                message: `Delete image ${path}`,
                sha: sha
            }
        });

        // console.log(`[GitHub] Deleted image: ${path}`);
    } catch (error) {
        console.error('GitHub Delete Error:', error.message);
        // Don't throw, just log. Deletion failure shouldn't block event deletion.
    }
};

module.exports = { uploadToGitHub, deleteFromGitHub };
