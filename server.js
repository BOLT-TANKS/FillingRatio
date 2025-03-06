const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());

const corsOptions = {
    origin: 'https://www.bolt-tanks.com/test-tank-finder',
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const brevoApiKey = process.env.BREVO_API_KEY;

app.post('/send-email', async (req, res) => {
    const brevoData = req.body;
    const templateId = parseInt(process.env.TEMPLATE_ID);

    try {
        console.log("Received data:", brevoData);

        // Filling Ratio Calculation
        const density15 = parseFloat(brevoData.density15);
        const density50 = parseFloat(brevoData.density50);
        const tankCapacity = parseFloat(brevoData.tankCapacity);
        const tpCode = brevoData.tpCode;

        if (isNaN(density15) || isNaN(density50) || isNaN(tankCapacity)) {
            return res.status(400).json({ success: false, message: "Invalid numerical values." });
        }

        const alpha = (density15 - density50) / (density50 * 35);
        let maxFillingPercentage;

        if (tpCode === "TP1") {
            maxFillingPercentage = 97 / (1 + alpha * (50 - 15));
        } else if (tpCode === "TP2") {
            maxFillingPercentage = 95 / (1 + alpha * (50 - 15));
        } else {
            return res.status(400).json({ success: false, message: "Invalid TP Code." });
        }

        const maxVolume = (tankCapacity * maxFillingPercentage) / 100;
        const maxMass = maxVolume * density15;

        // Brevo Integration (Contact and Email)
        let contactExists = false;
        try {
            const contactCheckResponse = await axios.get(`https://api.brevo.com/v3/contacts/${brevoData.email}`, {
                headers: {
                    'accept': 'application/json',
                    'api-key': brevoApiKey,
                    'content-type': 'application/json'
                }
            });
            if (contactCheckResponse.status === 200) {
                contactExists = true;
                console.log("Contact already exists");
            }
        } catch (contactCheckError) {
            if (contactCheckError.response && contactCheckError.response.status === 404) {
                console.log("Contact does not exist. 404 received.");
            } else {
                console.error("Error checking for existing contact:", contactCheckError);
                return res.status(500).json({ success: false, message: "Error checking contact existence." });
            }
        }

        if (contactExists) {
            await axios.put(`https://api.brevo.com/v3/contacts/${brevoData.email}`, {
                attributes: brevoData
            }, {
                headers: {
                    'accept': 'application/json',
                    'api-key': brevoApiKey,
                    'content-type': 'application/json'
                }
            });
            console.log("Existing contact updated");
        } else {
            await axios.post('https://api.brevo.com/v3/contacts', {
                email: brevoData.email,
                attributes: brevoData
            }, {
                headers: {
                    'accept': 'application/json',
                    'api-key': brevoApiKey,
                    'content-type': 'application/json'
                }
            });
            console.log("New contact created");
        }

        await axios.post('https://api.brevo.com/v3/smtp/email', {
            to: [{ email: brevoData.email }],
            templateId: templateId,
            params: brevoData
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json'
            }
        });

        res.json({
            success: true,
            message: 'Email sent and contact saved/updated.',
            maxFillingPercentage: maxFillingPercentage,
            maxVolume: maxVolume,
            maxMass: maxMass
        });
    } catch (error) {
        console.error('Brevo API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Error sending email or saving/updating contact.' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
