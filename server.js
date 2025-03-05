const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const brevoApiKey = process.env.BREVO_API_KEY;

app.post('/send-email', async (req, res) => {
    const brevoData = req.body;
    const templateId = parseInt(process.env.TEMPLATE_ID);

    try {
        console.log("Received data:", brevoData);

        // Check if contact exists
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
            // Update existing contact
            await axios.put(`https://api.brevo.com/v3/contacts/${brevoData.email}`, {
                attributes: brevoData.attributes
            }, {
                headers: {
                    'accept': 'application/json',
                    'api-key': brevoApiKey,
                    'content-type': 'application/json'
                }
            });
            console.log("Existing contact updated");
        } else {
            // Create new contact
            console.log("Brevo contact creation request body:", {
                email: brevoData.email,
                attributes: brevoData.attributes
            });

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
            console.log("New contact created");
        }

        console.log("Template ID being used:", templateId);
        console.log("Template ID type:", typeof templateId);

        // Send email using template
        const emailResponse = await axios.post('https://api.brevo.com/v3/smtp/email', {
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

        console.log("Email response:", emailResponse.data);

        res.json({ success: true, message: 'Email sent and contact saved/updated.' });
    } catch (error) {
        console.error('Brevo API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Error sending email or saving/updating contact.' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
