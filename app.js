require('dotenv').config();

const axios = require('axios');
const nodemailer = require('nodemailer');

// Configure the API endpoint and email settings
const apiUrl = 'https://talep.citroen.com.tr/elektrikli-araclar/app/Home/GetParams?ModelCode=ami';
const emailSettings = {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    headers: {
        'X-PM-Message-Stream': 'outbound'
    }
};

function logDate() {
    return new Date().toISOString();
};

// Create an email transporter
const transporter = nodemailer.createTransport(emailSettings);

// Function to send an email alert
const sendEmailAlert = async (price, deposit, reservationStatus) => {

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'TRY'
    });

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: process.env.MAIL_TO,
            subject: 'Citroen AMI restocked',
            text: `The Citroen AMI with orange color option might be on sale again, better check the ordering page ASAP 👉 https://talep.citroen.com.tr/amionlinesiparis/form/turuncu\n\nThe car is priced at ${currencyFormatter.format(price)} and asked deposit amount is ${currencyFormatter.format(deposit)}. Currently, reservations are ${reservationStatus ? 'also open' : 'not open'}.`
        });
        console.log(`${logDate()} :: Email alert sent successfully.`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// Function to fetch the JSON response and check for changes
const fetchDataAndCheckChanges = async () => {
    try {
        const response = await axios.get(apiUrl);
        const amiStock = response.data.stock_available_color[0].available;
        const amiReservation = response.data.reservation_available_color[0].available;
        const amiPrice = response.data.carPrice;
        const amiDeposit = response.data.ccAmount;

        // Log each attempt to the stdout
        console.log(`${logDate()} :: Checking the AMI availability...`);

        // Check if the stock status has changed
        if (amiStock == true) {
            console.log(`${logDate()} :: Stock status has been updated!`);
            await sendEmailAlert(amiPrice, amiDeposit, amiReservation);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

// Call the function initially
fetchDataAndCheckChanges();

// Schedule the function to run every 5 minutes using a cron job
setInterval(fetchDataAndCheckChanges, 5 * 60 * 1000);