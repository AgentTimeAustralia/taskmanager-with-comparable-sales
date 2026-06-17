"use strict";

require("dotenv").config();
// adding what s recomeneded

const catalyst = require("zcatalyst-sdk-node");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
  const catalystApp = catalyst.initialize(req);

  const datastore = catalystApp.datastore();

  const usageTable = datastore.table("WidgetUsageLogs");
  const creditsTable = datastore.table("CreditsBalance");
  const htagConsumptionTable = datastore.table("HTAGConsumptionLogs");
  const zcql = catalystApp.zcql();

  // =============================================
  // CORS
  // =============================================

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-org-id, x-crm-user, x-record-id"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(200);

    res.end();

    return;
  }

  let startTime;

  let usageBreakdown = [];

  let totalBillingUnits = 0;

  let totalBillingCost = 0;

  let currentBillingBalance = null;

  try {
    // =============================================
    // AUTHENTICATION CHECK
    // =============================================

    const currentUser = await catalystApp.userManagement().getCurrentUser();

    console.log("AUTHENTICATED USER:", currentUser);

    if (!currentUser || !currentUser.user_id) {
      res.writeHead(401, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          success: false,
          message: "Unauthorized",
        })
      );

      return;
    }

    // =============================================
    // ORG DETAILS
    // =============================================

    const orgId = req.headers["x-org-id"];
    console.log("ORG ID HEADER:", orgId);

    const crmUser = req.headers["x-crm-user"] || "Unknown User";
    // =============================================
    // FETCH CREDIT BALANCE
    // =============================================

    const creditResult = await zcql.executeZCQLQuery(
      `SELECT * FROM CreditsBalance WHERE OrgID='${orgId}'`
    );

    console.log("CREDIT RESULT:", JSON.stringify(creditResult, null, 2));

    // =============================================
    // EXECUTION TIMER + BILLING TRACKING
    // =============================================

    startTime = Date.now();

    // ============================================
    // GET ADDRESS FROM QUERY PARAMS
    // ============================================

    const url = new URL(req.url, "http://localhost");
    const address = url.searchParams.get("address");
    const existingAddressKey = url.searchParams.get("address_key");

    if (!address) {
      res.writeHead(400, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "missing_address",
          message: "Address is required.",
        })
      );

      return;
    }

    // ============================================
    // GET API KEY
    // ============================================

    const apiKey = process.env.HTAG_API_KEY;

    if (!apiKey) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "missing_api_key",
          message: "HTAG API key missing.",
        })
      );

      return;
    }

    // ============================================
    // STEP 1 - ADDRESS KEY RESOLUTION
    // ============================================

    let addressKey = existingAddressKey || "";

    console.log("EXISTING ADDRESS KEY:", addressKey);

    // ============================================
    // FALLBACK TO STANDARDISATION
    // ============================================

    if (!addressKey) {
      console.log("NO ADDRESS KEY FOUND. STANDARDISING:", address);

      const standardiseResponse = await fetch(
        "https://api.htagai.com/v1/address/standardise",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            addresses: [address],
          }),
        }
      );

      const standardiseData = await standardiseResponse.json();

      // ============================================
      // BILLING TRACKING
      // ============================================

      totalBillingUnits += Number(
        standardiseResponse.headers.get("x-billing-units") || 0
      );

      usageBreakdown.push(
        `address/standardise = ${
          standardiseResponse.headers.get("x-billing-units") || 0
        } units`
      );

      totalBillingCost += Number(
        standardiseResponse.headers.get("x-billing-cost") || 0
      );

      usageBreakdown.push(
        `address/standardise = ${
          standardiseResponse.headers.get("x-billing-cost") || 0
        } cost`
      );

      currentBillingBalance =
        standardiseResponse.headers.get("x-billing-balance") ||
        currentBillingBalance;

      console.log(
        "HTAG STANDARDISE RESPONSE:",
        JSON.stringify(standardiseData, null, 2)
      );

      // ============================================
      // HANDLE CREDIT LIMIT
      // ============================================

      if (standardiseResponse.status === 402) {
        res.writeHead(402, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            error: "payment_required",
            message:
              "HTAG API credits exhausted during address standardisation.",
          })
        );

        return;
      }

      // ============================================
      // HANDLE STANDARDISATION FAILURE
      // ============================================

      if (
        !standardiseData.results ||
        standardiseData.results.length === 0 ||
        !standardiseData.results[0].address_key
      ) {
        res.writeHead(404, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            error: "address_standardisation_failed",
            message: "Could not standardise address.",
            input_address: address,
            response: standardiseData,
          })
        );

        return;
      }

      // ============================================
      // EXTRACT GENERATED ADDRESS KEY
      // ============================================

      addressKey = standardiseData.results[0].address_key;
    }

    console.log("FINAL ADDRESS KEY:", addressKey);

    // ============================================
    // STEP 2 - SOLD SEARCH USING ADDRESS KEY
    // ============================================

    const soldSearchUrl =
      `https://api.htagai.com/v1/property/sold/search?` +
      `address_key=${encodeURIComponent(addressKey)}` +
      `&radius_km=2` +
      `&proximity=any` +
      `&limit=5`;

    console.log("HTAG SOLD SEARCH URL:", soldSearchUrl);

    const soldResponse = await fetch(soldSearchUrl, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    });

    const soldData = await soldResponse.json();

    // ============================================
    // BILLING TRACKING
    // ============================================

    totalBillingUnits += Number(
      soldResponse.headers.get("x-billing-units") || 0
    );

    usageBreakdown.push(
      `property/sold/search = ${
        soldResponse.headers.get("x-billing-units") || 0
      } units`
    );

    totalBillingCost += Number(soldResponse.headers.get("x-billing-cost") || 0);

    usageBreakdown.push(
      `property/sold/search = ${
        soldResponse.headers.get("x-billing-cost") || 0
      } cost`
    );

    currentBillingBalance =
      soldResponse.headers.get("x-billing-balance") || currentBillingBalance;

    // ============================================
    // UPDATE CREDIT BALANCE
    // ============================================

    try {
      const creditRow = creditResult[0].CreditsBalance;

      const currentCredits = Number(creditRow.CreditsRemaining || 0);

      if (currentCredits <= 0) {
        res.writeHead(402, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            error: "insufficient_credits",
            message:
              "Oops! You have insufficient credits. Please visit our website to top-up.",
          })
        );

        return;
      }

      const newBalance = Math.max(0, currentCredits - totalBillingUnits);

      console.log(
        "CREDIT DEDUCTION:",
        currentCredits,
        "-",
        totalBillingUnits,
        "=",
        newBalance
      );

      await creditsTable.updateRow({
        ROWID: creditRow.ROWID,
        CreditsRemaining: newBalance,
      });
    } catch (creditUpdateError) {
      console.error("CREDIT UPDATE ERROR:", creditUpdateError);
    }

    // ============================================
    // HTAG CONSUMPTION LOG
    // ============================================

    try {

      console.log(
        "ENTERING HTAG CONSUMPTION LOG BLOCK"
      );
    
      const insertedRow =
        await htagConsumptionTable.insertRow({
    
          ModuleName: "Acquisition",
    
          WidgetName: "Comparable Sales",
    
          OrgID: orgId,
    
          APIUnitsConsumed: totalBillingUnits,
    
          APICost: totalBillingCost,
    
          FunctionName: "getComparableSales",
    
          ExecutionDateTime: new Date(),
    
          RecordID:
            req.headers["x-record-id"] || ""
    
        });
    
      console.log(
        "HTAG INSERT RESULT:",
        JSON.stringify(insertedRow, null, 2)
      );
    
    } catch (htagLogError) {
    
      console.error(
        "HTAG CONSUMPTION LOG ERROR:",
        JSON.stringify(htagLogError, null, 2)
      );
    
    }

    // ============================================
    // Inserting Log To Data Storage
    // ============================================

    try {
      await usageTable.insertRow({
        Org_ID: req.headers["x-org-id"] || "Unknown Org",

        CRM_User: req.headers["x-crm-user"] || "Unknown User",

        Function_Name: "getComparableSales",

        Feature_Name: "Comparable Sales",

        Record_ID: req.headers["x-record-id"] || "Unknown Record",

        Execution_Time_MS: Date.now() - startTime,

        Status: soldResponse.ok ? "success" : "error",

        API_Consumption: totalBillingUnits,

        Usage_Response: usageBreakdown.join("\n"),
      });
    } catch (loggingError) {
      console.error("LOGGING ERROR:", loggingError);
    }

    console.log(
      "HTAG SOLD SEARCH RESPONSE:",
      JSON.stringify(soldData, null, 2)
    );

    // ============================================
    // HANDLE CREDIT LIMIT
    // ============================================

    if (soldResponse.status === 402) {
      res.writeHead(402, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "payment_required",
          message:
            "HTAG API credits exhausted during comparable sales search. Contact support@agenttime.au",
        })
      );

      return;
    }

    // ============================================
    // HANDLE NO RESULTS
    // ============================================

    if (!soldData.results || soldData.results.length === 0) {
      res.writeHead(404, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "no_results",
          message: `No comparable sales found for ${address} try again later`,
          searched_address: address,
          address_key: addressKey,
          htag_response: soldData,
        })
      );

      return;
    }

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        success: true,
        input_address: address,
        address_key: addressKey,
        total_results: soldData.total || 0,
        comparable_sales: soldData.results.map((item) => ({
          street_address: item.street_address || "",

          suburb: item.suburb || "",

          sold_price: item.sold_price || 0,

          sold_date: item.sold_date || "",

          bedrooms: item.bedrooms || 0,

          bathrooms: item.bathrooms || 0,

          car_spaces: item.car_spaces || 0,

          land_area: item.land_area || 0,

          property_type: item.property_type || "",
        })),
      })
    );
  } catch (error) {
    try {
      await usageTable.insertRow({
        Org_ID: req.headers["x-org-id"] || "Unknown Org",

        CRM_User: req.headers["x-crm-user"] || "Unknown User",

        Function_Name: "getComparableSales",

        Feature_Name: "Comparable Sales",

        Record_ID: req.headers["x-record-id"] || "Unknown Record",

        Execution_Time_MS: Date.now() - startTime,

        Status: "failed",

        API_Consumption: totalBillingUnits || 0,

        Usage_Response:
          (usageBreakdown || []).join("\n") +
          "\nERROR: " +
          (error.message || "Unknown Error"),
      });
    } catch (loggingError) {
      console.error("FAILURE LOGGING ERROR:", loggingError);
    }

    console.error("SERVER ERROR:", error);

    res.writeHead(500, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        error: "server_error",
        message: error.message,
      })
    );
  }
};
