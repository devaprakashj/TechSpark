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
        const coordsData = await getJSON('https://firestore.googleapis.com/v1/projects/techspark-b06bc/databases/(default)/documents/coordinators');
        if (coordsData.documents) {
            coordsData.documents.forEach((doc, idx) => {
                console.log(`\n=== Document ${idx+1}: ${doc.name.split('/').pop()} ===`);
                const fields = doc.fields || {};
                for (const [k, v] of Object.entries(fields)) {
                    console.log(`  ${k}: ${JSON.stringify(v)}`);
                }
            });
        } else {
            console.log('No coordinators documents found or empty collection.', coordsData);
        }
    } catch (err) {
        console.error('Error fetching coordinators:', err.message);
    }
}

run();
