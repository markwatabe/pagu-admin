#!/bin/bash
# Download all 100 WebstaurantStore invoices using curl with browser cookies
OUTDIR="/Users/markwatabe/Documents/GitHub/pagu-admin/invoices"
COOKIES=$(cat /tmp/wrs_cookies.txt)
BASE="https://www.webstaurantstore.com"
COUNT=0
TOTAL=$(wc -l < /tmp/invoice_urls_b64.txt)

while IFS='|' read -r filename b64path; do
  COUNT=$((COUNT + 1))
  # Decode the base64 path to get the relative URL
  path=$(echo "$b64path" | base64 -d)
  url="${BASE}${path}"
  outfile="${OUTDIR}/${filename}"

  if [ -f "$outfile" ] && [ -s "$outfile" ]; then
    echo "[$COUNT/$TOTAL] Already exists: $filename — stopping (all newer invoices downloaded)"
    break
  fi

  echo "[$COUNT/$TOTAL] Downloading: $filename"
  curl -sS -L -o "$outfile" \
    -H "Cookie: ${COOKIES}" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
    -H "Accept: application/pdf,*/*" \
    -H "Referer: https://www.webstaurantstore.com/myaccount/orders/" \
    "$url"

  # Check if download succeeded
  if [ -f "$outfile" ] && [ -s "$outfile" ]; then
    SIZE=$(wc -c < "$outfile")
    echo "  OK: ${SIZE} bytes"
  else
    echo "  FAILED"
  fi

  # Random delay 1-3 seconds
  DELAY=$(( (RANDOM % 3) + 1 ))
  sleep $DELAY
done < /tmp/invoice_urls_b64.txt

echo "Done! Downloaded to $OUTDIR"
