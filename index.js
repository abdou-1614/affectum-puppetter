const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
process.env.TZ = 'America/New_York';
let output = [];
const { createCanvas, loadImage } = require('canvas');

async function fullPageScreenshot(url, specificViewport) {
  // Create the "screenshots" directory if it doesn't exist
  const screenshotsDir = 'sa-screenshots';
  output[specificViewport] = screenshotsDir;

  async function captureIframeScreenshots(page) {
    const iframes = await page.$$('iframe');
    const iframeImages = [];

    const parentStyles = await page.$$eval('style, link[rel="stylesheet"]', (styles) => {
      return styles.map((style) => {
        if (style.tagName === 'STYLE') {
          return { type: 'style', content: style.innerHTML };
        } else {
          return { type: 'link', url: style.href };
        }
      });
    });

    for (let i = 0; i < iframes.length; i++) {
      try {
        const frame = await iframes[i].contentFrame();
        const frameUrl = frame.url();
        if (frameUrl) {
          const framePage = await browser.newPage();
          await framePage.goto(frameUrl, { waitUntil: 'networkidle2', timeout: 60000 });

          // Inject parent window styles into the iframe
          for (const style of parentStyles) {
            if (style.type === 'style') {
              await framePage.addStyleTag({ content: style.content });
            } else {
              await framePage.addStyleTag({ url: style.url });
            }
          }

          const screenshot = await framePage.screenshot({ fullPage: true, type: 'jpeg' });
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


  const browser = await puppeteer.launch({args: 
    ['--no-sandbox', '--disable-setuid-sandbox'], 
    headless: false, 
    defaultViewport: specificViewport});

  const page = await browser.newPage();

  try {
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (error) {
    console.error(`Error navigating to ${url}: ${error.message}`);
  }

  if (url === 'https://www.iwp.edu/graduate-school-b/') {
    await new Promise(r => setTimeout(r, 3000));
    await page.waitForSelector('iframe', {timeout: 10000});
  } else if (url === 'https://www.quicksilverscientific.com/') {
    await page.waitForSelector('.swiper-slide-inner', {timeout: 8000});
    await new Promise(r => setTimeout(r, 4000));
    await page.addStyleTag({
      content: `
        * {
            transition-duration: 0.1s !important
        }
      `
    });
    
    const bulEl = await page.waitForSelector('.swiper-pagination-bullet')
    await bulEl.click()
    await page.waitForSelector('.elementor-swiper', { timeout: 6000 })
    const el = await page.waitForSelector('.cmplz-btn')
    await el.click()
    await new Promise(r => setTimeout(r, 8000));
  } else if (url === 'https://www.partners.net/') {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 6000));
  }

  // Set the viewport size
  //await page.setViewport(specificViewport);

  // Scroll the page to ensure all elements are loaded
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let scrollTop = -1;
      const interval = setInterval(() => {
        window.scrollBy(0, 100);
        if (document.documentElement.scrollTop === scrollTop) {
          clearInterval(interval);
          resolve();
        } else {
          scrollTop = document.documentElement.scrollTop;
        }
      }, 100);
    });
  });

  // Scroll back to the top of the page so sticky menus appear at the right place
  // https://github.com/garris/BackstopJS/issues/1318
  await page.evaluate(() => window.scrollTo(0, 0));

  // wait for 5 seconds to allow the page to load
  await new Promise(r => setTimeout(r, 5000));

  // Capture the full-page screenshot
  const mainScreenshot = await page.screenshot({ fullPage: true, type: 'jpeg' });

  // Capture iframe screenshots
  const iframeImages = await captureIframeScreenshots(page);

  // Merge the main screenshot with iframe screenshots
  const mainImage = await loadImage(mainScreenshot);
  await new Promise(r => setTimeout(r, 4000)); // Delay for 1 second
  const canvas = createCanvas(mainImage.width, mainImage.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(mainImage, 0, 0);
  for (const iframeImage of iframeImages) {
    const { screenshot, position } = iframeImage;
    const iframeImg = await loadImage(screenshot);
    if (position) {
      ctx.drawImage(iframeImg, position.x , position.y, position.width, position.height);
    }
  }
  

  // Save the merged screenshot to a file in the "screenshots" directory
  const output_file = path.join(
    screenshotsDir,
    `${url.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
  );
  const out = fs.createWriteStream(output_file);
  const stream = canvas.createJPEGStream();
  stream.pipe(out);
  out.on('finish', () => {});

  // Close the browser
  await browser.close();
}

//fullPageScreenshot('https://www.iwp.edu/graduate-school-b/', { width: 1536, height: 960 });

//fullPageScreenshot('https://www.partners.net/', { width: 1536, height: 960 });

//fullPageScreenshot('https://www.newtarget.com/', { width: 1536, height: 960 });

fullPageScreenshot('https://www.quicksilverscientific.com/', { width: 1536, height: 960 });
