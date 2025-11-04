# SaxonJS Library

This directory contains the SaxonJS **Browser Runtime** version.

## Important: Browser Runtime Version

⚠️ **Make sure you use `SaxonJS2.rt.js` (Browser Runtime), NOT `SaxonJS2N.js` (Node.js version)**

The Node.js version uses `require()` which doesn't work in browsers.

## How to Download and Install

1. **Download SaxonJS Browser Runtime:**
   - Visit: https://www.saxonica.com/download/javascript.xml
   - Download the latest version (SaxonJS 2.7 or 2.6)
   - Extract the ZIP file

2. **Copy the correct file:**
   - From the extracted package, find `SaxonJS2.rt.js` (Browser Runtime)
   - **DO NOT use** `SaxonJS2N.js` (that's for Node.js)
   - Copy `SaxonJS2.rt.js` to this `lib` directory

3. **Verify the file:**
   - The file should be named `SaxonJS2.rt.js` in this directory
   - File size should be around 2-3 MB

4. **Alternative - Direct download:**
   ```bash
   cd /Users/abhisheksinha/Desktop/XML/lib
   # Download Browser Runtime version (correct for browsers)
   curl -L -o SaxonJS2.rt.js https://cdn.jsdelivr.net/npm/saxon-js@2.7.0/SaxonJS2.rt.js
   ```

## File Structure

```
lib/
  ├── SaxonJS2.rt.js  (required - Browser Runtime version)
  └── README.md       (this file)
```

## After Installation

The `index.html` is already configured to use the local file. Just refresh your browser!

## Troubleshooting

- **Error: "require is not defined"** → You're using the Node.js version (`SaxonJS2N.js`). Use `SaxonJS2.rt.js` instead.
- **Error: "SaxonJS not loaded"** → Check that `SaxonJS2.rt.js` exists in the `lib/` directory
- **File not found** → Make sure the file is named exactly `SaxonJS2.rt.js` (case-sensitive)

