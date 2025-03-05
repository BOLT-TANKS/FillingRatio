const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const brevoApiKey = process.env.BREVO_API_KEY;
const templateId = process.env.TEMPLATE_ID;

app.post('/send-email', async (req, res) => {
    const brevoData = req.body;

    try {
        await axios.post('https://api.brevo.com/v3/contacts', {
            email: brevoData.email,
            attributes: brevoData.attributes
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json'
            }
        });

        await axios.post('https://api.brevo.com/v3/smtp/email', {
            to: [{ email: brevoData.email }],
            templateId: templateId,
            params: brevoData.attributes
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json'
            }
        });

        res.json({ success: true, message: 'Email sent and contact saved.' });
    } catch (error) {
        console.error('Brevo API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Error sending email or saving contact.' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
