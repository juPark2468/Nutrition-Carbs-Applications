import express from 'express';
import fs from 'fs' ;

const router = express.Router();

const DEXCOM_BASE = 'https://sandbox-api.dexcom.com';
const DEX_ACCOUNT_FILE_BASE = "./dexcomToken.json"

function readToken(req, res) {
    if(!fs.existsSync(DEX_ACCOUNT_FILE_BASE))return null;
    const data = fs.readFileSync(DEX_ACCOUNT_FILE_BASE, 'utf8');
    return JSON.parse(data);
}

function writeToken(tokens) {
    fs.writeFileSync(DEX_ACCOUNT_FILE_BASE, JSON.stringify(tokens, null, 2));
}

let dexcomToken = readToken();

router.get('/auth/dexcom/login', (req, res) => {
    const authUrl = `${DEXCOM_BASE}/v3/oauth2/login?` + new URLSearchParams({
        client_id: process.env.DEXCOM_CLIENT_ID,
        redirect_uri: process.env.DEXCOM_REDIRECT_URI,
        response_type: 'code',
        scope: 'offline_access',
        state: 'somestate123',
    });
    res.redirect(authUrl);
});

router.get('/auth/dexcom/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    try {
        const tokenRes = await fetch(`${DEXCOM_BASE}/v3/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DEXCOM_CLIENT_ID,
                client_secret: process.env.DEXCOM_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.DEXCOM_REDIRECT_URI,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) return res.status(400).json(tokenData);

        dexcomToken = tokenData;
        writeToken(tokenData);

        res.send('Dexcom connected! You can close this tab and go back to the app.');
    } catch (err) {
        console.error('Error exchanging code for token:', err);
        res.status(500).json({ error: 'Token exchange failed' });
    }
});

router.get('/api/dataRange', async (req, res) => {
    if (!dexcomToken) {
        return res.status(401).json({ error: 'Not connected to Dexcom yet' });
    }

    try {
        const rangeRes = await fetch(`${DEXCOM_BASE}/v3/users/self/dataRange`, {
            headers: {
                Authorization: `Bearer ${dexcomToken.access_token}`,
            },
        });

        const data = await rangeRes.json();
        res.json(data);
    } catch (err) {
        console.error('Error fetching data range:', err);
        res.status(500).json({ error: 'Failed to fetch data range' });
    }
});

router.get('/api/glucose', async (req, res) => {
    if (!dexcomToken) return res.status(401).json({ error: 'Not connected to Dexcom yet' });

    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (24*60*60*1000));
        // const startDate = new Date(endDate.getTime() - (15*60*1000));

        const formatDate = (date) => date.toISOString().slice(0, 19);

        const egvsRes = await fetch(
            `${DEXCOM_BASE}/v3/users/self/egvs?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`,
            { headers: { Authorization: `Bearer ${dexcomToken.access_token}` } }
        );

        const data = await egvsRes.json();
        res.set('Cache-Control', 'no-store');
        res.json(data);
    } catch (err) {
        console.error('Error fetching glucose data:', err);
        res.status(500).json({ error: 'Failed to fetch glucose data' });
    }
});

export default router;