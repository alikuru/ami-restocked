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
    }
};

// Function to create timestamps for logs
logDate = () => { return moment().format('YYYY-MM-DDTHH:mm:ss.sssZ'); };

// Create an email transporter
const transporter = nodemailer.createTransport(emailSettings);

// Function to send an email alert
const sendEmailAlert = async (price, deposit, reservationStatus, color, slug, colorStock, colorReservation) => {

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'TRY'
    });

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: process.env.MAIL_TO,
            subject: 'Citroen AMI restocked',
            text: `The Citroen AMI is in stock again! ${colorStock ? `Even ${color} color option might be on sale again` : 'Your favorite color is not available right now but you might want to consider other options'}, better check the ordering page ASAP 👉 https://talep.citroen.com.tr/amionlinesiparis/form/${slug}\n\nThe car is priced at ${currencyFormatter.format(price)} and asked deposit amount is ${currencyFormatter.format(deposit)}. Currently, reservations are ${reservationStatus ? `also open${colorReservation ? ' for the color you seek' : ' but not for the color you seek'}` : 'not open'}.`,
            headers: {
                'X-PM-Message-Stream': 'outbound'
            }
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
        const amiTarget = () => {
            const amiStockIndex = response.data.stock_available_color.findIndex(item => item['color'] == process.env.AMI_COLOR);
            const amiReservationIndex = response.data.reservation_available_color.findIndex(item => item['color'] == process.env.AMI_COLOR);
            const getAmiStockStatus = () => {
                if (amiStockIndex != -1) {
                    return response.data.reservation_available_color[amiStockIndex].available;
                } else {
                    return false;
                }
            };
            const getAmiReservationStatus = () => {
                if (amiStockIndex != -1) {
                    return response.data.reservation_available_color[amiReservationIndex].available;
                } else {
                    return false;
                }
            };
            const setAmiColor = (choice) => {
                let amiColorChoice;
                switch (choice) {
                    case '1':
                        amiColorChoice = 'blue';
                        break;
                    case '2':
                        amiColorChoice = 'green';
                        break;
                    case '3':
                        amiColorChoice = 'gray';
                        break;
                    case '4':
                        amiColorChoice = 'orange';
                        break;
                    default:
                        amiColorChoice = 'orange';
                }

                return amiColorChoice;
            }
            const setAmiSlug = (choice) => {
                let amiColorSlug;
                switch (choice) {
                    case '1':
                        amiColorSlug = 'mavi';
                        break;
                    case '2':
                        amiColorSlug = 'yesil';
                        break;
                    case '3':
                        amiColorSlug = 'gri';
                        break;
                    case '4':
                        amiColorSlug = 'turuncu';
                        break;
                    default:
                        amiColorSlug = 'turuncu';
                }

                return amiColorSlug;
            }

            const amiChoice = {
                amiColor: setAmiColor(process.env.AMI_COLOR),
                amiSlug: setAmiSlug(process.env.AMI_COLOR),
                amiStock: getAmiStockStatus(),
                amiReservation: getAmiReservationStatus()
            };

            return amiChoice;
        }
        const amiColor = amiTarget().amiColor;
        const amiSlug = amiTarget().amiSlug;
        const amiGeneralStock = response.data.stock_available_color[response.data.stock_available_color.findIndex(item => item['color'] == -1)].available;
        const amiGeneralReservation = response.data.reservation_available_color[response.data.reservation_available_color.findIndex(item => item['color'] == -1)].available;
        const amiPrefferredStock = amiTarget().amiStock;
        const amiPrefferredReservation = amiTarget().amiReservation;
        const amiPrice = response.data.carPrice;
        const amiDeposit = response.data.ccAmount;

        // Log each attempt to the stdout
        console.log(`${logDate()}\t:: Checking the AMI availability...`);

        // Check if the stock status has changed
        if (amiGeneralStock == true) {
            console.log(`${logDate()}\t:: Stock status has been updated!`);
            await sendEmailAlert(amiPrice, amiDeposit, amiGeneralReservation, amiColor, amiSlug, amiPrefferredStock, amiPrefferredReservation);
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