<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                exclude-result-prefixes="xs">
  
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>Cost Summary - BOMForge</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #2196F3; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .assembly-row { font-weight: bold; background-color: #e3f2fd; }
          .part-row { padding-left: 30px; }
          .total-row { font-weight: bold; font-size: 1.1em; background-color: #4CAF50; color: white; }
        </style>
      </head>
      <body>
        <h1>Cost Summary</h1>
        <p>Bill of Materials Cost Breakdown</p>
        <xsl:apply-templates/>
      </body>
    </html>
  </xsl:template>
  
  <xsl:template match="bom">
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Type</th>
          <th>Quantity</th>
          <th>Unit Cost</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <xsl:apply-templates select="assembly | part" mode="cost"/>
        <tr class="total-row">
          <td colspan="4" style="text-align: right;">Grand Total:</td>
          <td>$<xsl:value-of select="format-number(sum(.//part/(cost * quantity)), '#0.00')"/></td>
        </tr>
      </tbody>
    </table>
  </xsl:template>
  
  <xsl:template match="assembly" mode="cost">
    <xsl:variable name="assemblyTotal" select="sum(.//part/(cost * quantity))"/>
    <tr class="assembly-row">
      <td>📦 <xsl:value-of select="name"/></td>
      <td>Assembly</td>
      <td>1</td>
      <td>-</td>
      <td>$<xsl:value-of select="format-number($assemblyTotal, '#0.00')"/></td>
    </tr>
    <xsl:apply-templates select="assembly | part" mode="cost"/>
  </xsl:template>
  
  <xsl:template match="part" mode="cost">
    <tr class="part-row">
      <td>🔩 <xsl:value-of select="name"/></td>
      <td>Part</td>
      <td><xsl:value-of select="quantity"/></td>
      <td>$<xsl:value-of select="format-number(cost, '#0.00')"/></td>
      <td>$<xsl:value-of select="format-number(cost * quantity, '#0.00')"/></td>
    </tr>
  </xsl:template>
  
</xsl:stylesheet>

