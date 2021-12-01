const puppeteer = require('puppeteer');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const fs = require('fs');
const iconv = require('iconv-lite');
const log4js = require('log4js');
const stringifySync = require("csv-stringify/lib/sync");
const AWS = require('aws-sdk');
require('dotenv').config()

log4js.configure('log-config.json');
const logger = log4js.getLogger();
logger.level = process.env.LOG_LEVEL;

async function usageCSVDownload(graphKindSelector) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: false,
        slowMo: 50,
        defaultViewport: { 'width': 1200, 'height': 900 }
    });

    const downloadPath = path.resolve('./download/');

    const page = await browser.newPage();

    try {
        // ログイン処理
        const url = process.env.LOGIN_URL;
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        await page.type('#TAccountLoginid', process.env.LOGIN_USER);
        await page.type("#TAccountPass", process.env.PASSWORD);
        await page.click('#TAccountIndexForm > div.lf_co_main > div > div > div > div.lf_doorBox > div.lf_pa_btn_big0 > button');

        client = await page.target().createCDPSession();
        client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath
        })

        // 電気料金をダウンロード
        await page.click(graphKindSelector);
        await page.waitForTimeout(500);
        await page.click('#ele_graph_sec > div > div.lf_csv_dl_area > div > div > a');
        await page.waitForTimeout(1000);
    } catch (e) {
        logger.error('Download Failed', e);
        process.exit(1);
    }

    logger.info('Download Success');

    browser.close();
}

function getFileName(date, wantDate) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    console.log(date)
    if (wantDate === 'day') {
        return `${year}-${month}-${day}.csv`;
    } else {
        return `${year}-${month}.csv`;
    }
}

async function uploadToS3(key, csv) {
    const uploadParmas = {
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        Body: csv,
    }
    const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    await s3.upload(uploadParmas, function(err, data) {
        if (err) {
            logger.info("Upload Error: ", err);
        }
        if (data) {
            logger.info("Upload Success", data.Location);
        }
    });
}

(async() => {
    // '#dayBtn > span > span'
    // '#hourBtn > span > span'
    const periodSelector = process.argv[2];
    const s3Prefix = process.argv[3];
    await usageCSVDownload(periodSelector);
    const data = iconv.decode(
        fs.readFileSync('./download/download'),
        'Shift_JIS'
    );
    let records = parse(data, {
        columns: false,
    }).slice(1);
    records = records.map(value => {
        if (value[1] === '') {
            value[1] = 0;
        }
        return value.slice(0, -1);
    });
    const csvString = stringifySync(records);
    logger.debug(csvString);
    const today = new Date();
    await uploadToS3(path.join(s3Prefix, getFileName(today, s3Prefix)), csvString);
})();