# WebstaurantStore Invoice Downloader

Downloads invoice PDFs from WebstaurantStore using browser cookies + curl.

## Prerequisites

- Chrome with the Claude-in-Chrome extension (or any way to extract cookies)
- `curl` and `base64` (preinstalled on macOS)

## How It Works

WebstaurantStore invoice URLs use encrypted order numbers, not plain ones. The actual download links look like:

```
/myaccount:trackorder/ordertracking/invoice?orderNumber=<encrypted>&emailAddress=<encrypted>
```

Since these encrypted parameters can only be obtained from the logged-in page, the process is:

1. **Extract invoice URLs** from the orders page via JavaScript in the browser
2. **Extract session cookies** from the browser
3. **Download PDFs** with `curl` using those cookies

## Step-by-Step

### 1. Open WebstaurantStore Orders

Navigate to https://www.webstaurantstore.com/myaccount/orders/ in Chrome while logged in.

### 2. Collect All Invoice URLs

Run this in the browser console (F12 > Console). It auto-pages through all orders:

```javascript
window.__masterList = [];
window.__collectionDone = false;

function collectAndAdvance() {
  const links = [...document.querySelectorAll('a[href*="invoice"]')];
  const seen = new Set();
  for (const l of links) {
    const href = l.getAttribute('href');
    if (seen.has(href)) continue;
    seen.add(href);
    window.__masterList.push(l.getAttribute('download') + '|' + btoa(href));
  }

  const pageDesc = document.querySelector('.zest-pagination--pageDescription');
  const text = pageDesc ? pageDesc.textContent : '';
  console.log('Collected page, total=' + window.__masterList.length + ' ' + text);

  // Check if last page
  if (text.match(/\d+-(\d+) of \1/) || text.includes('of 100') && text.match(/9[7-9]|100/)) {
    window.__collectionDone = true;
    console.log('DONE! Total URLs: ' + window.__masterList.length);
    // Print all URLs
    console.log('--- COPY BELOW ---');
    console.log(window.__masterList.join('\n'));
    console.log('--- COPY ABOVE ---');
    return;
  }

  const nextBtn = document.querySelector('button[aria-label="Next page"]');
  if (nextBtn) {
    nextBtn.click();
    setTimeout(collectAndAdvance, 3000);
  } else {
    window.__collectionDone = true;
    console.log('DONE (no next button)! Total URLs: ' + window.__masterList.length);
    console.log('--- COPY BELOW ---');
    console.log(window.__masterList.join('\n'));
    console.log('--- COPY ABOVE ---');
  }
}

collectAndAdvance();
```

Copy the output between `--- COPY BELOW ---` and `--- COPY ABOVE ---` and save it to a file:

```bash
pbpaste > /tmp/invoice_urls_b64.txt
```

### 3. Extract Cookies

Run this in the same browser console:

```javascript
console.log(document.cookie);
```

Copy the output and save it:

```bash
pbpaste > /tmp/wrs_cookies.txt
```

### 4. Download Invoices

```bash
bash invoices/download.sh
```

The URL list is sorted newest-first (matching the orders page). The script stops as soon as it hits an already-downloaded file, so re-runs only download new invoices.

### Downloading Only New Invoices

To download invoices added since the last run:

1. Repeat steps 2-3 to get fresh URLs and cookies
2. Run `download.sh` — it downloads new invoices at the top of the list and stops when it reaches one that already exists

## Files

| File | Purpose |
|------|---------|
| `download.sh` | Curl-based download script |
| `*.pdf` | Downloaded invoice PDFs, named by order number |
