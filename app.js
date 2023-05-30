require('dotenv').config();

const axios = require('axios');
const nodemailer = require('nodemailer');
const moment = require('moment');

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

// Function to create timestamps for logs
logDate = () => { return moment().format('YYYY-MM-DDTHH:mm:ss.sssZ'); };

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
        console.log(`${logDate()}\t:: Email alert sent successfully.`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// Set a holder for stopping point indicator
let retryCycle = 0;

// Function to fetch the JSON response and check for changes
const fetchDataAndCheckChanges = async () => {
    try {
        const response = await axios.get(apiUrl);
        const amiStock = response.data.stock_available_color[0].available;
        const amiReservation = response.data.reservation_available_color[0].available;
        const amiPrice = response.data.carPrice;
        const amiDeposit = response.data.ccAmount;

        // Log each attempt to the stdout
        console.log(`${logDate()}\t:: Checking the AMI availability...`);

        // Check if the stock status has changed
        if (amiStock == true) {
            console.log(`${logDate()}\t:: Stock status has been updated!`);
            await sendEmailAlert(amiPrice, amiDeposit, amiReservation);
            retryCycle++
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

// Call the function initially
fetchDataAndCheckChanges();

// Schedule a continuous run of the function for a defined interval. 
const retryInterval = setInterval(() => {
    if (retryCycle == process.env.RETRY_NOMORE) {
        clearInterval(retryInterval);
        console.log('Mission accomplished, terminating. Good luck!');
        process.exitCode = 1;
    } else {
        fetchDataAndCheckChanges();
    };
}, process.env.RETRY_FREQUENCY * 60 * 1000);