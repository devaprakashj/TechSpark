const https = require('https');

function getJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        const adminData = await getJSON('https://firestore.googleapis.com/v1/projects/techspark-b06bc/databases/(default)/documents/admin');
        if (adminData.documents) {
            adminData.documents.forEach((doc, idx) => {
                console.log(`\n=== Admin ${idx+1} ===`);
                const fields = doc.fields || {};
                for (const [k, v] of Object.entries(fields)) {
                    console.log(`  ${k}: ${JSON.stringify(v)}`);
                }
            });
        } else {
            console.log('No admin documents found.', adminData);
        }
    } catch (err) {
        console.error('Error fetching admin:', err.message);
    }
}

run();
