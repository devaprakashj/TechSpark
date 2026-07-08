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
        const eventsData = await getJSON('https://firestore.googleapis.com/v1/projects/techspark-b06bc/databases/(default)/documents/events');
        if (eventsData.documents) {
            eventsData.documents.forEach((doc, idx) => {
                console.log(`--- Event ${idx+1} ---`);
                const fields = doc.fields || {};
                for (const [k, v] of Object.entries(fields)) {
                    console.log(`  ${k}: ${JSON.stringify(v)}`);
                }
            });
        }
    } catch (err) {
        console.error('Error fetching events:', err.message);
    }
}

run();
