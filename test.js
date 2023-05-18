const puppeteer = require('puppeteer');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function captureScreenshots(urls) {
  const screenshotsDir = 'sa-screenshots';
  const viewport = { width: 1536, height: 960 }  
  async function captureIframeScreenshots(page) {
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
  
  for (let i = 0; i < urls.length; i++) {
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
    const url = urls[i];
    page.setDefaultNavigationTimeout(0)
    console.log(`Capturing screenshot for ${url}`);
    try {
        // Navigate to the URL
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
      } catch (error) {
        console.error(`Error navigating to ${url}: ${error.message}`);
      }
    if (url === 'https://www.iwp.edu/graduate-school-b/' ) {
        await new Promise(r => setTimeout(r, 3000));
        await page.waitForSelector('iframe', {timeout: 0});
        // Wait for the iframe to fully load
        await page.evaluate(() => {
        const iframe = document.querySelector('#pardot_admissions');
        iframe.style.height = '1300px';
        iframe.style.width = '100%';
      });
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
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 8000));
      } else if (url === 'https://www.partners.net/') {
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await new Promise(r => setTimeout(r, 6000));
      } else if (url === 'https://fticommunications.com/'){
        const elCl = await page.waitForSelector('#wt-cli-accept-all-btn')
        await elCl.click()
        await new Promise(r => setTimeout(r, 5000));
        await page.addStyleTag({
            content: `
              * {
                background-attachment: initial !important;
              }
            `
          });
      } else if (url === 'https://www.aprico.life/') {
        await page.click('button.cmplz-btn.cmplz-accept');
        await new Promise(r => setTimeout(r, 5000));
      } else if (url === 'https://www.intelsat.com/'){
        const elClick = await page.$('#onetrust-accept-btn-handler')
        if(elClick) {
            await elClick.click()
        }
        await new Promise(r => setTimeout(r, 8000));
      }

    // Scroll to the bottom of the page to load any lazy loaded images
    await autoScroll(page);

     // Scroll back to the top of the page 

    if(url !== 'https://www.buckeye.com/') {
       await page.evaluate(() => window.scrollTo(0, 0));
    }
    if(url === 'https://exponentii.org/'){
      await page.addStyleTag({
        content: `
         .tdi_52 .td-module-thumb {
            height: 106rem !important;
          }
        `
      });
    }

    //await page.evaluate(() => window.scrollTo(0, 0));

      await new Promise(r => setTimeout(r, 10000));
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
      if (url === 'https://www.iwp.edu/graduate-school-b/' || 'https://www.iwp.edu/graduate-school-a/') {
        if(position){
          ctx.drawImage(iframeImg, position.x + 1400, position.y, position.width, position.height);
        }
      } else {
        ctx.drawImage(iframeImg, position.x, position.y, position.width, position.height);
      }
    }
    

    // Save the screenshot to a file
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
  }

}

async function autoScroll(page){
  await new Promise(r => setTimeout(r, 5000));
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      let distance = 100;
      let timer = setInterval(() => {
        let scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

  

const urls = [  
  'https://exponentii.org/',
  'https://www.partners.net/'
];

captureScreenshots(urls);
