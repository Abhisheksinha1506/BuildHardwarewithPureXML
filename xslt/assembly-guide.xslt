<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                exclude-result-prefixes="xs">
  
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  
  <xsl:template match="/">
    <html>
      <head>
        <title>Assembly Guide - BOMForge</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .step { margin: 30px 0; padding: 20px; border-left: 4px solid #2196F3; background-color: #f5f5f5; }
          .step-number { font-size: 1.5em; font-weight: bold; color: #2196F3; margin-bottom: 10px; }
          .assembly-name { font-size: 1.3em; font-weight: bold; margin-bottom: 15px; }
          .part-list { margin: 15px 0; padding-left: 20px; }
          .part-item { margin: 8px 0; padding: 8px; background-color: white; border-radius: 4px; }
          .nested-step { margin-left: 30px; margin-top: 15px; }
          h1 { color: #2196F3; }
        </style>
      </head>
      <body>
        <h1>Assembly Guide</h1>
        <p>Step-by-step assembly instructions generated from BOM</p>
        <xsl:apply-templates/>
      </body>
    </html>
  </xsl:template>
  
  <xsl:template match="bom">
    <xsl:apply-templates select="assembly | part" mode="assembly">
      <xsl:with-param name="stepNumber" select="1"/>
    </xsl:apply-templates>
  </xsl:template>
  
  <xsl:template match="assembly" mode="assembly">
    <xsl:param name="stepNumber" as="xs:integer"/>
    
    <div class="step">
      <div class="step-number">Step <xsl:value-of select="$stepNumber"/></div>
      <div class="assembly-name">📦 Assemble: <xsl:value-of select="name"/></div>
      
      <xsl:if test="part">
        <div class="part-list">
          <strong>Required Parts:</strong>
          <xsl:for-each select="part">
            <div class="part-item">
              <strong>🔩 <xsl:value-of select="name"/></strong>
              <xsl:if test="quantity > 1"> (x<xsl:value-of select="quantity"/>)</xsl:if>
              <xsl:if test="sku != ''"> - SKU: <xsl:value-of select="sku"/></xsl:if>
              <xsl:if test="description != ''">
                <br/><em><xsl:value-of select="description"/></em>
              </xsl:if>
              <xsl:if test="compatibility/rule">
                <br/><span style="color: #666; font-size: 0.9em;">Compatibility: <xsl:value-of select="string-join(compatibility/rule, ', ')"/></span>
              </xsl:if>
            </div>
          </xsl:for-each>
        </div>
      </xsl:if>
      
      <xsl:variable name="subAssemblies" select="assembly"/>
      <xsl:variable name="nextStep" select="$stepNumber + 1 + count($subAssemblies)"/>
      
      <xsl:for-each select="assembly">
        <xsl:variable name="subStep" select="$stepNumber + position()"/>
        <xsl:apply-templates select="." mode="assembly">
          <xsl:with-param name="stepNumber" select="$subStep"/>
        </xsl:apply-templates>
      </xsl:for-each>
      
      <div style="margin-top: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 4px;">
        <strong>Assembly Complete:</strong> Install assembled <xsl:value-of select="name"/> into parent assembly.
      </div>
    </div>
  </xsl:template>
  
  <xsl:template match="part" mode="assembly">
    <xsl:param name="stepNumber" as="xs:integer"/>
    <!-- Parts are handled within their parent assembly -->
  </xsl:template>
  
</xsl:stylesheet>

