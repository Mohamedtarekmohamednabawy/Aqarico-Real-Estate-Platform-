// Removed nodemailer, relying solely on axios for Resend integration
import axios from 'axios';

/**
 * Send 2FA verification code via Email
 */
export const sendEmailCode = async (email, code) => {
    try {
        // Using the Google Apps Script Webhook to natively bypass all blocked ports!
        const url = process.env.GOOGLE_SCRIPT_URL;

        if (!url) {
            console.error('\n==============================================');
            console.error('[EMAIL ERROR] GOOGLE_SCRIPT_URL is not defined!');
            console.error('Please check your .env file or Railway variables.');
            console.error('==============================================\n');
            return false;
        }

        console.log(`\n==============================================`);
        console.log(`[EMAIL PROXY DEBUG] Initiating email to: ${email}`);
        console.log(`[EMAIL PROXY DEBUG] Sending to Google Apps Script Webhook...`);

        const data = {
            to_email: email,
            code: code
        };

        const response = await axios.post(url, data, {
            // Google Apps Script expects Follow Redirects, Axios does this natively
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // To avoid any preflight issues
            }
        });

        console.log(`[EMAIL PROXY DEBUG] GAS Webhook Response Status: ${response.status}`);
        console.log(`[EMAIL PROXY DEBUG] GAS Webhook Response Body:`, response.data);
        console.log(`==============================================\n`);

        // Check if the script actually reported success
        if (response.data && response.data.success === false) {
            console.error(`[EMAIL PROXY ERROR] Google Script reported failure: ${response.data.error}`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`\n==============================================`);
        console.error('[EMAIL PROXY ERROR] Axios failed to reach Google Apps Script!');
        console.error('[EMAIL PROXY ERROR] Error Message:', error.message);
        if (error.response) {
            console.error('[EMAIL PROXY ERROR] Error Response Status:', error.response.status);
            console.error('[EMAIL PROXY ERROR] Error Response Data:', error.response.data);
        }
        console.error(`==============================================\n`);
        return false;
    }
};

/**
 * Send 2FA verification code via WhatsApp (Ultramsg API)
 */
export const sendWhatsAppCode = async (phone, code) => {
    try {
        if (!process.env.ULTRAMSG_INSTANCE_ID || !process.env.ULTRAMSG_TOKEN) {
            console.warn('Ultramsg credentials missing, skipping WhatsApp.');
            return false;
        }

        const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
        const token = process.env.ULTRAMSG_TOKEN;
        const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

        // Ensure phone number starts with country code and has no '+' for Ultramsg
        let cleanPhone = phone.replace(/\D/g, '');

        // Egyptian phone number fix: if it starts with 01, prepend 2
        if (cleanPhone.startsWith('01')) {
            cleanPhone = '2' + cleanPhone;
        }
        // If it starts with 1, prepend 2 (in case user omitted the 0)
        else if (cleanPhone.startsWith('1') && cleanPhone.length === 10) {
            cleanPhone = '20' + cleanPhone;
        }

        console.log(`\n==============================================`);
        console.log(`[WHATSAPP DEBUG] Initiating message to: ${cleanPhone}`);
        console.log(`[WHATSAPP DEBUG] Using Instance: ${instanceId}`);

        const data = {
            token: token,
            to: cleanPhone,
            body: `Your Aqarico verification code is: ${code}\nThis code expires in 10 minutes.`,
        };

        const response = await axios.post(url, data);

        console.log(`[WHATSAPP DEBUG] Response Status: ${response.status}`);
        console.log(`[WHATSAPP DEBUG] Response Data:`, response.data);
        console.log(`[WHATSAPP DEBUG] Message successfully queued`);
        console.log(`==============================================\n`);

        return true;
    } catch (error) {
        console.error(`\n==============================================`);
        console.error('[WHATSAPP DEBUG ERROR] Failed to send message');
        console.error('[WHATSAPP DEBUG ERROR] Error:', error.message);
        if (error.response) {
            console.error('[WHATSAPP DEBUG ERROR] Response Status:', error.response.status);
            console.error('[WHATSAPP DEBUG ERROR] Response Data:', error.response.data);
        }
        console.error(`==============================================\n`);
        return false;
    }
};

/**
 * Unified 2FA sender
 */
export const send2FACode = async (user, code) => {
    const emailPromise = sendEmailCode(user.email, code);
    const whatsappPromise = user.phone ? sendWhatsAppCode(user.phone, code) : Promise.resolve(false);

    return Promise.all([emailPromise, whatsappPromise]);
};
