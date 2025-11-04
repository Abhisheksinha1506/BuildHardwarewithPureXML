<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                exclude-result-prefixes="xs">
  
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>Shopping List - BOMForge</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .supplier-group { margin-top: 30px; }
          .supplier-header { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
          .total { font-weight: bold; font-size: 1.1em; }
        </style>
      </head>
      <body>
        <h1>Shopping List</h1>
        <p>Generated from BOMForge</p>
        <xsl:apply-templates/>
      </body>
    </html>
  </xsl:template>
  
  <xsl:template match="bom">
    <xsl:variable name="allParts" as="element(part)*">
      <xsl:call-template name="collectParts">
        <xsl:with-param name="node" select="."/>
      </xsl:call-template>
    </xsl:variable>
    
    <xsl:for-each-group select="$allParts" group-by="if (supplier != '') then supplier else 'Unspecified'">
      <xsl:sort select="current-grouping-key()"/>
      <xsl:variable name="supplier" select="current-grouping-key()"/>
      <xsl:variable name="parts" select="current-group()"/>
      
      <div class="supplier-group">
        <div class="supplier-header">Supplier: <xsl:value-of select="$supplier"/></div>
        <table>
          <thead>
            <tr>
              <th>Part Name</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="$parts">
              <xsl:sort select="name"/>
              <tr>
                <td><xsl:value-of select="name"/></td>
                <td><xsl:value-of select="if (sku != '') then sku else '-'"/></td>
                <td><xsl:value-of select="quantity"/></td>
                <td>$<xsl:value-of select="format-number(cost, '#0.00')"/></td>
                <td>$<xsl:value-of select="format-number(cost * quantity, '#0.00')"/></td>
              </tr>
            </xsl:for-each>
            <tr class="total">
              <td colspan="4" style="text-align: right;">Supplier Total:</td>
              <td>$<xsl:value-of select="format-number(sum($parts/(cost * quantity)), '#0.00')"/></td>
            </tr>
          </tbody>
        </table>
      </div>
    </xsl:for-each-group>
    
    <div style="margin-top: 30px; font-size: 1.2em; font-weight: bold;">
      <p>Grand Total: $<xsl:value-of select="format-number(sum($allParts/(cost * quantity)), '#0.00')"/></p>
    </div>
  </xsl:template>
  
  <xsl:template name="collectParts">
    <xsl:param name="node" as="node()"/>
    <xsl:for-each select="$node/part">
      <xsl:sequence select="."/>
    </xsl:for-each>
    <xsl:for-each select="$node/assembly">
      <xsl:call-template name="collectParts">
        <xsl:with-param name="node" select="."/>
      </xsl:call-template>
    </xsl:for-each>
  </xsl:template>
  
</xsl:stylesheet>

