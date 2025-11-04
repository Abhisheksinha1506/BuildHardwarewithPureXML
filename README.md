# BOMForge – Build Hardware with Pure XML

**Problem**: Makers waste hours fixing BOM errors in spreadsheets.  
**Solution**: One `.xml` file = full product structure, validation, and multi-format output.  
**Tech**: XML + XSD + XSLT 3.0 + HTML5 (zero backend)

## ✨ Features

- **Visual BOM Editor**: Hierarchical parts tree with drag-drop interface
- **Real-Time XML Generation**: Your BOM is always valid XML
- **XSD Validation**: Ensures data integrity and compatibility rules
- **XSLT Transformations**: Generate 3 outputs from one XML file:
  - **Shopping List**: Grouped by supplier, ready for ordering
  - **Cost Summary**: Hierarchical cost breakdown with totals
  - **Assembly Guide**: Step-by-step instructions
- **One-Click Export**: Download XML + 3 HTML outputs as ZIP
- **Dark Mode**: Easy on the eyes
- **Zero Backend**: 100% static, runs in browser

## 🛠️ Tech Stack

- **Vanilla JavaScript** (<200 LOC core logic)
- **XML + XSD** for data modeling and validation
- **XSLT 3.0** (SaxonJS) for transformations
- **HTML5** with modern CSS
- **JSZip** for export functionality
- **No frameworks, no build tools** (except CDN libraries)

## 🚀 Quick Start

### Prerequisites

- A web server (Python, Node.js, PHP, or VS Code Live Server)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for CDN libraries on first load)

### Option 1: Using Python (Recommended)

1. **Navigate to the project directory:**
   ```bash
   cd /path/to/XML
   ```

2. **Start a local server:**
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Or Python 2
   python -m SimpleHTTPServer 8000
   ```

3. **Open in your browser:**
   ```
   http://localhost:8000
   ```

### Option 2: Using Node.js

1. **Navigate to the project directory:**
   ```bash
   cd /path/to/XML
   ```

2. **Start a local server:**
   ```bash
   # Using npx (no installation needed)
   npx serve
   
   # Or install serve globally first
   npm install -g serve
   serve
   ```

3. **Open the URL shown in terminal** (usually `http://localhost:3000`)

### Option 3: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 4: Using PHP (if installed)

```bash
cd /path/to/XML
php -S localhost:8000
```

### ⚠️ Important Notes

- **You MUST use a web server** (not just open `index.html` directly) because:
  - XSLT files are loaded via `fetch()` which requires HTTP protocol
  - CORS restrictions prevent loading local files directly
- **The application uses CDN libraries** (SaxonJS, JSZip), so you need an internet connection
- **Port 8000 is default** - if it's busy, use a different port (e.g., 8001, 8080)

## 📦 Installation

### Step 1: Clone or Download

```bash
git clone https://github.com/yourname/bomforge.git
cd bomforge
```

### Step 2: Download SaxonJS (Optional but Recommended)

The application will try to load SaxonJS from CDN, but for better performance and offline support, download it locally:

1. **Visit SaxonJS Download Page:**
   ```
   https://www.saxonica.com/download/javascript.xml
   ```

2. **Download SaxonJS 2.6 or 2.7** (latest stable version)

3. **Extract the ZIP file** and find `SaxonJS2.rt.js` (Browser Runtime version)

4. **Copy to your project:**
   ```bash
   # Create lib directory if it doesn't exist
   mkdir -p lib
   
   # Copy SaxonJS2.rt.js to lib/ directory
   cp /path/to/extracted/SaxonJS2.rt.js lib/
   ```

5. **Verify:**
   ```bash
   ls -lh lib/SaxonJS2.rt.js
   # Should show ~2-3 MB file size
   ```

**Note**: The application will automatically use the local file if available, otherwise fall back to CDN.

### Step 3: Serve Locally

Follow the "Quick Start" instructions above to run the application.

## 📖 Usage

### Creating a BOM

1. **Click "+ Assembly"** or **"+ Part"** to add items
2. **Select an item** to edit details:
   - Part name, SKU, quantity, cost
   - Supplier information
   - Compatibility rules (e.g., "M3 threads")
3. **Build nested assemblies** by adding parts/assemblies to parent assemblies
4. **Real-time validation** ensures data integrity

### Working with BOMs

- **Load Sample**: Click "Load Sample" to see an example 3D printer hotend BOM
- **Load BOM**: Click "Load BOM" to import an existing `.xml` or `.bom.xml` file
- **Save BOM**: Click "Save BOM" to download your BOM as `bomforge.bom.xml`

### Exporting

1. **Click "Export All"** to generate:
   - `bom.xml` - Your BOM file
   - `shopping-list.html` - Shopping list grouped by supplier
   - `cost-summary.html` - Cost breakdown
   - `assembly-guide.html` - Step-by-step assembly instructions
2. **All files are packaged** in `bomforge-export.zip`
3. **View outputs** in the browser using the tabs in the XSLT Outputs panel

### Features

- **Dark Mode**: Toggle theme with the "🌙 Dark Mode" button
- **Validation**: Real-time validation shows errors at the bottom
- **Cost Calculation**: Automatic cost calculation for assemblies
- **Delete Items**: Click "Delete" button next to any item in the tree

## 🏗️ Project Structure

```
bomforge/
├── index.html              # Main UI
├── js/
│   ├── app.js             # Core application logic
│   ├── bom-builder.js     # XML BOM construction
│   └── export.js          # ZIP export & XSLT transformations
├── lib/
│   └── SaxonJS2.rt.js    # SaxonJS browser runtime (optional, download manually)
├── xsd/
│   └── bom.xsd            # XSD schema for validation
├── xslt/
│   ├── shopping-list.xslt # Shopping list HTML output
│   ├── cost-summary.xslt  # Cost summary with totals
│   └── assembly-guide.xslt # Step-by-step assembly guide
├── samples/
│   └── sample.bom.xml     # Example BOM file
├── styles/
│   └── main.css           # Dark mode + responsive styles
├── package.json           # Node.js dependencies
└── README.md              # This file
```

## 🔧 XSLT Compilation (Advanced)

SaxonJS browser runtime can use pre-compiled SEF (Stylesheet Export File) formats for better performance. To compile XSLT files to SEF:

### Prerequisites

- Node.js installed
- SaxonJS Node.js package

### Steps

1. **Install SaxonJS Node.js package:**
   ```bash
   npm install saxon-js
   ```

2. **Compile XSLT files to SEF:**
   ```bash
   # Compile shopping-list.xslt
   npx xslt3 -xsl:xslt/shopping-list.xslt -export:xslt/shopping-list.sef.json -nogo

   # Compile cost-summary.xslt
   npx xslt3 -xsl:xslt/cost-summary.xslt -export:xslt/cost-summary.sef.json -nogo

   # Compile assembly-guide.xslt
   npx xslt3 -xsl:xslt/assembly-guide.xslt -export:xslt/assembly-guide.sef.json -nogo
   ```

3. **Verify SEF files are created:**
   ```bash
   ls xslt/*.sef.json
   ```

The application will automatically use SEF files if they exist. If not, it falls back to browser's native XSLTProcessor (XSLT 1.0 only).

## ⚠️ Troubleshooting

### Port Already in Use

If port 8000 is busy, use a different port:
```bash
python3 -m http.server 8080
```
Then open: `http://localhost:8080`

### SaxonJS Not Loading

1. **Check browser console** (F12) for errors
2. **Download SaxonJS locally** (see Installation Step 2)
3. **Verify file location**: `lib/SaxonJS2.rt.js` exists
4. **Hard refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Export Not Working

1. **Check browser console** (F12) for errors
2. **SaxonJS errors?** - Download SaxonJS locally or compile XSLT to SEF
3. **File loading errors?** - Make sure you're using a web server

### XSLT Transformations Not Showing

The application uses SaxonJS for XSLT 3.0 transformations. If you see errors:

1. **Option 1**: Download SaxonJS locally (see Installation Step 2)
2. **Option 2**: Compile XSLT files to SEF format (see XSLT Compilation)
3. **Option 3**: The app will fall back to browser's native XSLTProcessor (XSLT 1.0 only)

### Files Not Loading

- Check browser console (F12) for errors
- Make sure you're accessing via `http://localhost` (not `file://`)
- Ensure internet connection (for CDN libraries)

### Can't Load/Save Files

- Make sure your browser allows file downloads
- Check browser permissions for file access
- Try a different browser if issues persist

## 🎯 Why BOMForge?

### For Makers

- **No Spreadsheet Errors**: Structured data prevents mistakes
- **Compatibility Validation**: XSD ensures parts fit together
- **Multi-Format Output**: One file, multiple uses
- **Free & Open Source**: No vendor lock-in
- **Portable**: Works offline, no backend required

### For Portfolio

- **Rare XML Expertise**: Demonstrates mastery of XSD, XSLT, and XPath
- **Visual Impact**: Drag-drop interface with instant transformations
- **Real-World Relevance**: Solves actual pain for makers, hardware startups, 3D printing shops
- **Pure XML Stack**: Industry-standard technologies

## 📁 File Formats

### BOM XML Format

Your BOM is saved as XML with this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<bom>
  <assembly>
    <name>Assembly Name</name>
    <part>
      <name>Part Name</name>
      <sku>SKU-123</sku>
      <quantity>1</quantity>
      <cost>12.99</cost>
      <supplier>Supplier Name</supplier>
      <description>Part description</description>
      <compatibility>
        <rule>M3 threads</rule>
        <rule>5mm hole</rule>
      </compatibility>
    </part>
  </assembly>
</bom>
```

### Export Files

- **bom.xml** - Source XML file
- **shopping-list.html** - HTML report grouped by supplier
- **cost-summary.html** - HTML cost breakdown
- **assembly-guide.html** - HTML assembly instructions

All files are packaged in `bomforge-export.zip` when you click "Export All".

## 🔮 Future Enhancements

- QR code generation for shop floor
- BOM diffing (XSLT compare)
- Import from DigiKey/Mouser CSV → XML
- Collaborative editing
- Version history
- BOM templates for common projects

## 📝 License

MIT License - feel free to use this in your portfolio!

## 🤝 Contributing

Pull requests welcome! This is a portfolio project, so contributions that improve the demo are especially appreciated.

## 🔗 Quick Reference

| Action | Method |
|--------|--------|
| Add Assembly | Click "+ Assembly" |
| Add Part | Click "+ Part" |
| Edit Details | Select item, edit in Part Details panel |
| Save Changes | Click "Save Changes" |
| Delete Item | Click "Delete" next to item |
| Save BOM | Click "Save BOM" |
| Load BOM | Click "Load BOM" |
| Load Sample | Click "Load Sample" |
| Export All | Click "Export All" |
| Toggle Dark Mode | Click "🌙 Dark Mode" |

---

**Built with ❤️ using pure XML, XSD, and XSLT 3.0**
