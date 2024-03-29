require('dotenv').config();

const axios = require('axios');
const nodemailer = require('nodemailer');
const moment = require('moment');

// Configure the API endpoint and email settings
const apiUrl = 'https://talep.citroen.com.tr/elektrikli-araclar/app/Home/GetParamsV2?ModelCode=ami';
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

// Function to format pricing
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TRY',
    currencyDisplay: 'narrowSymbol'
});

// Create an email transporter
const transporter = nodemailer.createTransport(emailSettings);

// Function to send an email alert
const sendEmailAlert = async (price, deposit, reservationStatus, colorOptionsStatus, color, slug, colorStock, colorReservation, tableHTML, tableText) => {
    const createMailBody = mailType => {
        const createNewLine = multiplier => {
            let lineBreak = '';
            if (mailType === 'html') {
                lineBreak = '<br/>';
            } else if (mailType === 'text') {
                lineBreak = '\n';
            } else {
                console.error('Mail body can either be formatted as HTML or text:', error);
            }

            return lineBreak.repeat(multiplier);
        }

        return `The Citroën AMI ${colorOptionsStatus.length <= 1 ? `might become available very soon` : `is in stock again`}! ${colorStock ? `Even ${color} color option might be on sale` : 'Your favorite color is not available right now but you might want to consider other options'}, better ${colorOptionsStatus.length <= 1 ? `${mailType === 'html' ? `<a href="https://talep.citroen.com.tr/amionlinesiparis/form/${slug}" title="Citroën Turkey - Purchase AMI online">start checking the ordering page</a> ⚡` : `start checking the ordering page ⚡ https://talep.citroen.com.tr/amionlinesiparis/form/${slug}`}` : `${mailType === 'html' ? `<a href="https://talep.citroen.com.tr/amionlinesiparis/form/${slug}" title="Citroën Turkey - Purchase AMI online">check the ordering page ASAP</a>  ⚡ `: `check the ordering page ASAP ⚡ https://talep.citroen.com.tr/amionlinesiparis/form/${slug}`}`}${createNewLine(2)}The car is priced at ${currencyFormatter.format(price)} and asked deposit amount is ${currencyFormatter.format(deposit)}. Currently, reservations are ${reservationStatus ? `also open${colorReservation ? ' for the color you seek 🎉' : ' but not for the color you seek 😔'}` : 'not open'}.${colorOptionsStatus.length <= 1 ? `` : `${createNewLine(2)}Here is a summary of what's available at the moment 👇${mailType === 'html' ? createNewLine(2) : createNewLine(1)}${mailType === 'html' ? tableHTML : tableText}`}`;
    };

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: process.env.MAIL_TO,
            subject: 'Citroën AMI restocked',
            html: createMailBody('html'),
            text: createMailBody('text'),
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
        const { carPrice: amiPrice, ccAmount: amiDeposit, colors: amiColors, stock_available_color: amiColorsAvailability, reservation_available_color: amiColorsReservation } = response.data;

        const amiTarget = () => {
            const amiStockIndex = amiColorsAvailability.findIndex(item => item['color'] == process.env.AMI_COLOR);
            const amiReservationIndex = amiColorsReservation.findIndex(item => item['color'] == process.env.AMI_COLOR);
            const getAmiStockStatus = () => {
                if (amiStockIndex != -1) {
                    return amiColorsAvailability[amiStockIndex].available;
                } else {
                    return false;
                }
            };
            const getAmiReservationStatus = () => {
                if (amiStockIndex != -1) {
                    return amiColorsReservation[amiReservationIndex].available;
                } else {
                    return false;
                }
            };
            const setAmiColor = choice => {
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
            const setAmiSlug = choice => {
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
                amiPrefferredColor: setAmiColor(process.env.AMI_COLOR),
                amiPrefferredSlug: setAmiSlug(process.env.AMI_COLOR),
                amiPrefferredStock: getAmiStockStatus(),
                amiPrefferredReservation: getAmiReservationStatus()
            };

            return amiChoice;
        }

        const { amiPrefferredColor, amiPrefferredSlug, amiPrefferredStock, amiPrefferredReservation } = amiTarget();
        const amiGeneralStock = amiColorsAvailability[amiColorsAvailability.findIndex(item => item['color'] == -1)].available;
        const amiGeneralReservation = amiColorsReservation[amiColorsReservation.findIndex(item => item['color'] == -1)].available;

        const amiListAllOptions = () => {
            const generateRows = () => {
                let rowsText = '';
                let rowsHTML = '';
                for (let index = 0; index < amiColorsAvailability.length; index++) {
                    const element = amiColorsAvailability[index];
                    if (element.color != -1) {
                        let amiRowColor = '';
                        const amiRowColorTranslator = () => {
                            switch (amiColors[amiColors.findIndex(item => item['id'] == element.color)].displayName) {
                                case 'Mavi':
                                    amiRowColor = 'Blue';
                                    break;
                                case 'Haki':
                                    amiRowColor = 'Green';
                                    break;
                                case 'Gri':
                                    amiRowColor = 'Gray';
                                    break;
                                case 'Turuncu':
                                    amiRowColor = 'Orange';
                                    break;
                                default:
                                    amiRowColor = 'Undefined';
                            }
                        };
                        amiRowColorTranslator();
                        const amiRowStock = element.available;
                        const amiRowReservation = amiColorsReservation[amiColorsReservation.findIndex(item => item['color'] == element.color)].available;
                        const amiRowPrice = () => {
                            const amiColorSpecificPrice = amiColors[amiColors.findIndex(item => item['id'] == element.color)].carPrice;
                            if (amiColorSpecificPrice <= 0) {
                                return currencyFormatter.format(amiPrice);
                            } else {
                                return currencyFormatter.format(amiColorSpecificPrice);
                            }
                        };

                        rowsText += `| ${amiRowColor.padEnd(10)}| ${(amiRowStock ? 'In stock' : 'Out of stock').padEnd(15)}| ${(amiRowReservation ? 'Yes' : 'No').padEnd(15)}| ${amiRowPrice().padEnd(16)}|\n`;

                        rowsHTML += `<tr style=\"height: 21px;\">\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; border: 1px solid rgb(204, 204, 204);\">${amiRowColor}<\/td>\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; border: 1px solid rgb(204, 204, 204);\">${amiRowStock ? 'In stock' : 'Out of stock'}<\/td>\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; border: 1px solid rgb(204, 204, 204);\">${amiRowReservation ? 'Yes' : 'No'}<\/td>\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; border: 1px solid rgb(204, 204, 204);\">${amiRowPrice()}<\/td>\r\n<\/tr>\r\n`;
                    }
                }
                const tableRows = {
                    html: rowsHTML,
                    text: rowsText
                }

                return tableRows;
            };

            const tableText = `-----------------------------------------------------------------\n| ${('Color').padEnd(10)}| ${('Stock?').padEnd(15)}| ${('Reservation?').padEnd(15)}| ${('Price').padEnd(16)}|\n-----------------------------------------------------------------\n${generateRows().text}-----------------------------------------------------------------`;

            const tableHTML = `<table dir=\"ltr\" style=\"table-layout: fixed; font-size: 10pt; font-family: arial, sans, sans-serif; width: 0px; border-collapse: collapse; border: medium none;\" cellspacing=\"0\" cellpadding=\"0\" border=\"1\">\r\n<colgroup>\r\n<col width=\"103\">\r\n<col width=\"115\">\r\n<col width=\"115\">\r\n<col width=\"124\">\r\n<\/colgroup>\r\n<tbody>\r\n<tr style=\"height: 21px;\">\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; font-weight: bold; border: 1px solid rgb(204, 204, 204);\">${('Color')}<\/td>\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; font-weight: bold; border: 1px solid rgb(204, 204, 204);\">${('Stock?')}<\/td>\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; font-weight: bold; border: 1px solid rgb(204, 204, 204);\">${('Reservation?')}<\/td>\r\n<td style=\"overflow: hidden; padding: 2px 3px; vertical-align: bottom; font-weight: bold; border: 1px solid rgb(204, 204, 204);\">${('Price')}<\/td>\r\n<\/tr>\r\n${generateRows().html}<\/tbody>\r\n<\/table>`;

            const tableData = {
                html: tableHTML,
                text: tableText
            }

            return tableData;
        }

        // Log each attempt to the stdout
        console.log(`${logDate()}\t:: Checking the AMI availability...`);

        // Check if the stock status has changed
        if (amiGeneralStock == true) {
            console.log(`${logDate()}\t:: Stock status has been updated!`);
            await sendEmailAlert(amiPrice, amiDeposit, amiGeneralReservation, amiColorsAvailability, amiPrefferredColor, amiPrefferredSlug, amiPrefferredStock, amiPrefferredReservation, amiListAllOptions().html, amiListAllOptions().text);
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