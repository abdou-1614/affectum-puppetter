const puppeteer = require('puppeteer');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function captureScreenshots(urls) {
  const screenshotsDir = 'sa-screenshots';
  const viewport = { width: 1536, height: 960 };

  async function captureIframeScreenshots(page) {
    const browser = await puppeteer.launch({
        args:     
        [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-background-networking',
        //'--disable-accelerated-2d-canvas'
        ], 
        headless: false, 
        defaultViewport: viewport
      });
    const iframes = await page.$$('iframe');
    const iframeImages = [];
  
    const parentStyles = await page.$$eval(
      'style, link[rel="stylesheet"]',
      (styles) => {
        return styles.map((style) => {
          if (style.tagName === 'STYLE') {
            return { type: 'style', content: style.innerHTML };
          } else {
            return { type: 'link', url: style.href };
          }
        });
      }
    );
  
    for (let i = 0; i < iframes.length; i++) {
      try {
        const frame = await iframes[i].contentFrame();
        const frameUrl = frame.url();
        if (frameUrl) {
          const framePage = await browser.newPage();
          await framePage.goto(frameUrl, {
            waitUntil: 'networkidle2',
            timeout: 0
          });
  
          // Wait for iframe to fully load
          await framePage.waitForSelector('body');
  
          // Disable web security to allow cross-origin requests
          await framePage.setBypassCSP(true);
  
          // Inject parent window styles into the iframe
          for (const style of parentStyles) {
            if (style.type === 'style') {
              await framePage.addStyleTag({ content: style.content });
            } else {
              await framePage.addStyleTag({ url: style.url });
            }
          }
          if (frameUrl === 'https://info.iwp.edu/l/887413/2023-03-02/lgl9v') {
            await framePage.evaluate(() => {
              // Adjust the height of the iframe element to ensure full visibility
              const iframe = document.querySelector('#wrapper');
              iframe.style.margin = '170px';
              iframe.style.width = '100%';
              iframe.style.height = '100%';
            });
          }
          await new Promise(r => setTimeout(r, 8000))
          const screenshot = await framePage.screenshot({
            fullPage: true,
            type: 'jpeg'
          });
          iframeImages.push({
            screenshot,
            position: await iframes[i].boundingBox()
          });
          await framePage.close();
        }
      } catch (error) {
        console.error(`Error capturing iframe screenshot: ${error.message}`);
      }
    }
    return iframeImages;
  }

  for (const urlData of urls) {
    const { url, waitForSelector, iframeSelector, clickSelector } = urlData;
    const browser = await puppeteer.launch({
        args:     
        [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-background-networking',
        //'--disable-accelerated-2d-canvas'
        ], 
        headless: false, 
        defaultViewport: viewport
      });
      const page = await browser.newPage();
      await page.setBypassCSP(true)
  
      console.log("START GETTING URLS ...")
      page.setDefaultNavigationTimeout(0)

    try {

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 0 });
      }

      if (iframeSelector) {
        await page.evaluate(() => {
          const iframe = document.querySelector('#pardot_admissions');
          iframe.style.height = '1300px';
          iframe.style.width = '100%';
        });
      }

      if (clickSelector) {
        await page.click(clickSelector);
      }

      if (url === 'https://www.quicksilverscientific.com/') {
        await page.addStyleTag({
          content: `
            * {
                transition-duration: 0.1s !important
            }
          `
        });
      } else if (url === 'https://fticommunications.com/') {
        await page.addStyleTag({
          content: `
            * {
              background-attachment: initial !important;
            }
          `
        });
      }

      await autoScroll(page);

      if (url !== 'https://www.buckeye.com/') {
        await page.evaluate(() => window.scrollTo(0, 0));
      }

      if (url === 'https://exponentii.org/') {
        await page.addStyleTag({
          content: `
            .tdi_52 .td-module-thumb {
              height: 106rem !important;
            }
          `
        });
      }

      await new Promise(r => setTimeout(r, 5000));
      const mainScreenshot = await page.screenshot({ fullPage: true, type: 'jpeg' });
      const iframeImages = await captureIframeScreenshots(page);

      const mainImage = await loadImage(mainScreenshot);
      await new Promise(r => setTimeout(r, 4000));
      const canvas = createCanvas(mainImage.width, mainImage.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(mainImage, 0, 0);

      for (const iframeImage of iframeImages) {
        const { screenshot, position } = iframeImage;
        const iframeImg = await loadImage(screenshot);
        if (
          url === 'https://www.iwp.edu/graduate-school-b/' ||
          url === 'https://www.iwp.edu/graduate-school-a/'
        ) {
          if (position) {
            ctx.drawImage(iframeImg, position.x + 1400, position.y, position.width, position.height);
          }
        } else {
          ctx.drawImage(iframeImg, position.x, position.y, position.width, position.height);
        }
      }

      const output_file = path.join(
        screenshotsDir,
        `${url.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
      );
      const out = fs.createWriteStream(output_file);
      const stream = canvas.createJPEGStream();
      stream.pipe(out);
      out.on('finish', () => {});

      console.log(`Screenshot saved to ${output_file}`);
    await browser.close();
    } catch (error) {
      console.error(`Error occurred while capturing screenshot: ${error.message}`);
    }
  }
}

async function autoScroll(page) {
  await new Promise(r => setTimeout(r, 5000));
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Example URLs array
const urls = [
  {
    url: 'https://www.iwp.edu/graduate-school-a/',
    waitForSelector: 'iframe',
    iframeSelector: '#pardot_admissions',
  },
  {
    url: 'https://www.quicksilverscientific.com/',
    waitForSelector: '.swiper-slide-inner',
    clickSelector: '.cmplz-btn',
  },
  {
    url: 'https://www.iwp.edu/graduate-school-b/',
    waitForSelector: 'iframe',
    iframeSelector: '#pardot_admissions',
  },
  {
    url: 'https://fticommunications.com/',
    waitForSelector: '#wt-cli-accept-all-btn',
    clickSelector: '#wt-cli-accept-all-btn',
  },
  {
    url: 'https://www.aprico.life/',
    clickSelector: 'button.cmplz-btn.cmplz-accept',
  },
  {
    url: 'https://www.intelsat.com/',
    clickSelector: '#onetrust-accept-btn-handler',
  },
  {
    url: 'https://exponentii.org/',
  },
  {
    url: 'https://www.wainao.me/',
  },
  {
    url: 'https://www.aprico.life/',
  },
  {
    url: 'https://www.buckeye.com/',
  },
  {
    url: 'https://www.partners.net/',
  },
];

captureScreenshots(urls);
