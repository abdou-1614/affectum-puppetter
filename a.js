async function captureIframeScreenshots(page) {
    const iframes = await page.$$('iframe');
    const results = [];
    for (const iframe of iframes) {
      const box = await iframe.boundingBox();
      if (box) {
        const { x, y, width, height } = box;
        const screenshot = await iframe.screenshot({ type: 'jpeg', quality: 90 });
        results.push({
          screenshot,
          position: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
        });
      }
    }
    return results;
  }