"use strict";

const catalyst = require("zcatalyst-sdk-node");
const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer-core");

// ======================================
// LOAD STATIC ASSETS
// ======================================

const assetsPath = path.join(__dirname, "assets");

const bedIcon = fs.readFileSync(path.join(assetsPath, "bed.png"), "base64");
const bathIcon = fs.readFileSync(path.join(assetsPath, "bath.png"), "base64");
const carIcon = fs.readFileSync(path.join(assetsPath, "car.png"), "base64");
const landIcon = fs.readFileSync(path.join(assetsPath, "land.png"), "base64");
const houseIcon = fs.readFileSync(path.join(assetsPath, "house.png"), "base64");

console.log("Bed icon length:", bedIcon.length);
console.log("Bath icon length:", bathIcon.length);
console.log("Car icon length:", carIcon.length);
console.log("Land icon length:", landIcon.length);
console.log("House icon length:", houseIcon.length);

const propertyImage = fs.readFileSync(
  path.join(assetsPath, "property-placeholder.png"),
  "base64"
);

const htagLogo = fs.readFileSync(
  path.join(assetsPath, "htag-logo.png"),
  "base64"
);

module.exports = async (req, res) => {
  const catalystApp = catalyst.initialize(req);

  try {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      const payload = JSON.parse(body);

      // ======================================
      // BUILD COMPARABLE SALES TABLE
      // ======================================

      let comparableRows = "";

      const comparableSales = payload.comparableSales || [];

      for (const sale of comparableSales) {
        comparableRows += `

        <div class="sale-card">
        
            <div class="sale-image">
        
                <img src="assets/property-placeholder.png">
        
            </div>
        
            <div class="sale-content">
        
                <div class="sale-top">
        
                    <div class="sale-type">
        
                        ${sale.property_type || "Property"}
        
                    </div>
        
                    <div class="sale-price">
        
                    ${
                      isNaN(Number(sale.sold_price))
                      ? "&N/A"
                      : "$" + Number(sale.sold_price).toLocaleString("en-AU")
                      }
        
                    </div>
        
                </div>
        
                <div class="sale-address">
        
                    ${sale.street_address || "-"}
        
                </div>
        
                <div class="sale-icons">
        
                    <div>
        
                        <img src="assets/bed.png">
        
                        ${sale.bedrooms || "-"}
        
                    </div>
        
                    <div>
        
                        <img src="assets/bath.png">
        
                        ${sale.bathrooms || "-"}
        
                    </div>
        
                    <div>
        
                        <img src="assets/car.png">
        
                        ${sale.car_spaces || "-"}
        
                    </div>
        
                    <div>
        
                        <img src="assets/land.png">
        
                        ${sale.land_area ? sale.land_area + " sqm" : "-"}
        
                    </div>
        
                </div>
        
                <div class="sale-footer">
        
                    <div>
        
                        <strong>Sold</strong>
        
                        ${sale.sold_date || "-"}
        
                    </div>
        
                </div>
        
            </div>
        
        </div>
        
        `;
      }

      const templatePath = path.join(__dirname, "templates", "cmaReport.html");

      let html = fs.readFileSync(templatePath, "utf8");

     // ======================================
      // MAP RECENTLY ADDED PROPERTY DETAILS
      // ======================================
      html = html.replaceAll(
        "{{PROPERTY_ADDRESS}}",
        payload.property.Address || "-"
      );

      html = html.replaceAll(
        "{{GENERATED_BY}}",
        payload.generatedBy.name || "-"
      );

      html = html.replaceAll(
        "{{GENERATED_DATE}}",
        new Date(payload.generatedAt).toLocaleDateString("en-AU")
      );

      // Basic Specs
      html = html.replaceAll("{{BEDROOMS}}", payload.property.Bedrooms || "-");
      html = html.replaceAll("{{BATHROOMS}}", payload.property.Bathrooms || "-");
      html = html.replaceAll("{{CAR_SPACES}}", payload.property.Car_Spaces || "-");
      html = html.replaceAll("{{LAND_SIZE}}", payload.property.Land_Size_sqm || "-");
      html = html.replaceAll("{{PROPERTY_TYPE}}", payload.property.Property_Type || "-");
      html = html.replaceAll("{{YEAR_BUILT}}", payload.property.Built || "-");
      html = html.replaceAll("{{ZONE}}", payload.property.Zoning || "-");
      html = html.replaceAll("{{LGA}}", payload.property.LGA || "-");
      html = html.replaceAll("{{SUBURB}}", payload.property.Suburb || "-");
      html = html.replaceAll("{{POSTCODE}}", payload.property.Postcode || "-");

      // Financials & Pricing (Formatting Numbers as Currency)
      const formatCurrency = (val) => {
        if (!val || isNaN(Number(val))) return "-";
        return "AU$ " + Number(val).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      html = html.replaceAll("{{LIST_PRICE}}", formatCurrency(payload.property.List_Price));
      html = html.replaceAll("{{ESTIMATED_VALUE}}", formatCurrency(payload.property.Property_Estimated_Value));
      html = html.replaceAll("{{RENTAL_APPRAISAL}}", formatCurrency(payload.property.Rental_Appraisal_per_week));
      html = html.replaceAll("{{EST_RENTAL_APPRAISAL}}", formatCurrency(payload.property.Estimated_Rental_Appraisal_per_week));
      html = html.replaceAll("{{COUNCIL_RATES}}", formatCurrency(payload.property.Council_Rates));
      html = html.replaceAll("{{STRATA_FEES}}", formatCurrency(payload.property.Strata_Fees_per_quarter));
      html = html.replaceAll("{{NEG_GEARING}}", formatCurrency(payload.property.Estimated_Negative_Gearing));
      html = html.replaceAll("{{RENTAL_YIELD}}", payload.property.Rental_Yield ? `${payload.property.Rental_Yield}%` : "-");

      // Due Diligence Flags
      html = html.replaceAll("{{FLOOD_ZONE}}", payload.property.Flood_Zone || "No");
      html = html.replaceAll("{{BUSH_FIRE}}", payload.property.Bush_Fire_Zone || "No");
      html = html.replaceAll("{{HERITAGE}}", payload.property.Heritage_Overlay || "No");

      // Suburb Profile Metrics
      html = html.replaceAll("{{SUBURB_MEDIAN_PRICE}}", formatCurrency(payload.property.Median_Price));
      html = html.replaceAll("{{SUBURB_MEDIAN_RENT}}", formatCurrency(payload.property.Median_Rent));
      html = html.replaceAll("{{SUBURB_POPULATION}}", payload.property.Population ? Number(payload.property.Population).toLocaleString("en-AU") : "-");
      html = html.replaceAll("{{THREE_YR_GROWTH}}", payload.property.Three_Year_Growth ? `${payload.property.Three_Year_Growth}%` : "-");
      html = html.replaceAll("{{FIVE_YR_GROWTH}}", payload.property.Five_Year_Growth ? `${payload.property.Five_Year_Growth}%` : "-");
      html = html.replaceAll("{{TEN_YR_GROWTH}}", payload.property.Ten_Year_Growth ? `${payload.property.Ten_Year_Growth}%` : "-");
      html = html.replaceAll("{{BUILD_APPROVAL}}", payload.property.Building_Approval_Ratio || "-");
      html = html.replaceAll("{{STOCK_ON_MARKET}}", payload.property.Stock_On_Market ? `${payload.property.Stock_On_Market}%` : "-");
      html = html.replaceAll("{{INVENTORY_LEVEL}}", payload.property.Inventory_Level || "-");
      html = html.replaceAll("{{VACANCY_RATE}}", payload.property.Vacancy_Rate1 ? `${payload.property.Vacancy_Rate1}%` : "-");

      // Fallbacks and Structure
      html = html.replaceAll("{{RADIUS}}", payload.search?.radius ? payload.search.radius + " km" : "-");
      html = html.replaceAll("{{COMPARABLE_ROWS}}", comparableRows);


      // ======================================
      // EMBED ALL IMAGES
      // ======================================

      html = html.replaceAll(
        'src="assets/bed.png"',
        `src="data:image/png;base64,${bedIcon}"`
      );
      
      html = html.replaceAll(
        'src="assets/bath.png"',
        `src="data:image/png;base64,${bathIcon}"`
      );
      
      html = html.replaceAll(
        'src="assets/car.png"',
        `src="data:image/png;base64,${carIcon}"`
      );
      
      html = html.replaceAll(
        'src="assets/land.png"',
        `src="data:image/png;base64,${landIcon}"`
      );
      
      html = html.replaceAll(
        'src="assets/house.png"',
        `src="data:image/png;base64,${houseIcon}"`
      );

      html = html.replaceAll(
        'src="assets/property-placeholder.png"',
        `src="data:image/png;base64,${propertyImage}"`
      );

      html = html.replaceAll(
        'src="assets/htag-logo.png"',
        `src="data:image/png;base64,${htagLogo}"`
      );


      // ======================================
      // GENERATE PDF
      // ======================================
      console.log("Connecting to SmartBrowz...");
console.log(process.env.CDP_ENDPOINT);

      const browser = await puppeteer.connect({
        browserWSEndpoint: process.env.CDP_ENDPOINT
      });

      console.log("Connected!");
      
      const page = await browser.newPage();
      
      await page.setContent(html, {
        waitUntil: "domcontentloaded"
      });
      
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true
      });
      
      await browser.close();



      // ======================================
      // RETURN PDF
      // ======================================

      res.setHeader("Content-Type", "application/pdf");
      const today = new Date();

const fileName =
`CMA_${
String(today.getDate()).padStart(2,"0")
}${
String(today.getMonth()+1).padStart(2,"0")
}${today.getFullYear()}_REPORT.pdf`;

res.setHeader(
"Content-Disposition",
`attachment; filename="${fileName}"`
);
      
      res.end(Buffer.from(pdf));
    });
  } catch (err) {
    console.error(err);

    res.writeHead(500, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        success: false,

        message: err.message,
      })
    );
  }
};
