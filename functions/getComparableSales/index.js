<!DOCTYPE html>
<html lang="en">

<head>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <meta charset="UTF-8">
    <title>CMA Report</title>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

<<<<<<< HEAD
      if (latestPayment) {
        lastTopupDate = latestPayment.LastTopupDate || "";
        lastTopup = Number(latestPayment.CreditToppedUp || 0);
      }
    }

    // console.log("LAST TOPUP:", lastTopup);
    // console.log("LAST TOPUP DATE:", lastTopupDate);
    // console.log("TOTAL PURCHASED:", totalCreditsPurchased);

    // console.log(
    //   "PAYMENT HISTORY RESULT:",
    //   JSON.stringify(paymentHistoryResult, null, 2)
    // );

    // console.log("API TENANT RESULT:", JSON.stringify(apiTenantResult, null, 2));

    if (apiTenantResult && apiTenantResult.length > 0) {
      tenantRow = apiTenantResult[0].apiTenants;
    }

    let latestPaymentGlobal = latestPayment;

    // =============================================
    // PAYMENT HISTORY TOPUP SYNC
    // =============================================

    if (
      apiTenantResult &&
      apiTenantResult.length > 0 &&
      paymentHistoryResult &&
      paymentHistoryResult.length > 0
    ) {
      tenantRow = apiTenantResult[0].apiTenants;

      const latestPayment = latestPaymentGlobal;

      // console.log(
      //   "LATEST PAYMENT ROW:",
      //   JSON.stringify(latestPayment, null, 2)
      // );

      // console.log("PAYMENT CREDIT:", latestPayment.CreditToppedUp);

      // console.log("PAYMENT DATE:", latestPayment.LastTopupDate);

      // console.log("TENANT LAST TOPUP:", tenantRow.LastTopUpDate);

      // console.log("TENANT CURRENT CREDITS:", tenantRow.CreditsLeft);

      const tenantLastTopup = tenantRow.LastTopUpDate
        ? new Date(tenantRow.LastTopUpDate)
        : null;

      const paymentLastTopup = latestPayment.LastTopupDate
        ? new Date(latestPayment.LastTopupDate)
        : null;

      if (
        paymentLastTopup &&
        (!tenantLastTopup || paymentLastTopup > tenantLastTopup)
      ) {
        // console.log("NEW TOPUP DETECTED");

        const topupCredits = Number(latestPayment.CreditToppedUp || 0);

        const currentCredits = Number(tenantRow.CreditsLeft || 0);

        const newCredits = currentCredits + topupCredits;

        // console.log("UPDATING APITENANTS =>", {
        //   creditsBefore: currentCredits,
        //   topupCredits,
        //   creditsAfter: newCredits,
        //   lastTopUpDate: latestPayment.LastTopupDate,
        // });

        await zcql.executeZCQLQuery(`
          UPDATE apiTenants
          SET CreditsLeft=${newCredits},
              CreditStatus='Active',
              LastTopUpDate='${latestPayment.LastTopupDate}'
          WHERE ROWID='${tenantRow.ROWID}'
          `);

        const refreshedTenant = await zcql.executeZCQLQuery(
          `SELECT * FROM apiTenants WHERE ROWID='${tenantRow.ROWID}'`
        );

        tenantRow = refreshedTenant[0].apiTenants;

        // console.log("TOPUP APPLIED:", topupCredits, "NEW BALANCE:", newCredits);
      }
    }

    if (!tenantRow) {
      throw new Error("No apiTenants record found for Org ID: " + orgId);
    }

    let currentCredits = Number(tenantRow.CreditsLeft || 0);

    const MIN_REQUIRED_CREDITS = 20;

    if (currentCredits < MIN_REQUIRED_CREDITS) {
      try {
        await usageTable.insertRow({
          Org_ID: orgId,

          CRM_User: req.headers["x-crm-user"] || "Unknown User",

          Function_Name: "getComparableSales",

          Feature_Name: "Comparable Sales",

          Record_ID: req.headers["x-record-id"] || "Unknown Record",

          Execution_Time_MS: 0,

          Status: "insufficient_credits",

          API_Consumption: 0,

          Usage_Response: `Available Credits=${currentCredits}, Required Credits=${MIN_REQUIRED_CREDITS}`,
        });
      } catch (logError) {
        console.error("INSUFFICIENT CREDIT LOG ERROR", logError);
      }

      res.writeHead(402, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "insufficient_credits",

          message: `Oops! Low credits left. Minimum ${MIN_REQUIRED_CREDITS} credits required to run Comparable Sales.`,

          available_credits: currentCredits,

          required_credits: MIN_REQUIRED_CREDITS,
        })
      );

      return;
    }

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
    const limit = Number(url.searchParams.get("limit")) || 5;
    const radius = Number(url.searchParams.get("radius")) || 2;

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

    // console.log("EXISTING ADDRESS KEY:", addressKey);

    // ============================================
    // FALLBACK TO STANDARDISATION
    // ============================================

    if (!addressKey) {
      // console.log("NO ADDRESS KEY FOUND. STANDARDISING:", address);

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
=======
        @page {
            size: A4 portrait;
            margin: 0;
>>>>>>> 85cccbc (feat: integrate dynamic CRM fields and fix PDF page-break top margins)
        }

<<<<<<< HEAD
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

      // console.log(
      //   "HTAG STANDARDISE RESPONSE:",
      //   JSON.stringify(standardiseData, null, 2)
      // );

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
              "Oops! You have exhausted credits. Please top-up and try again.",
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

    // console.log("FINAL ADDRESS KEY:", addressKey);

    // ============================================
    // STEP 2 - SOLD SEARCH USING ADDRESS KEY
    // ============================================

    const soldSearchUrl =
      `https://api.htagai.com/v1/property/sold/search?` +
      `address_key=${encodeURIComponent(addressKey)}` +
      `&radius_km=${radius}` +
      `&proximity=any` +
      `&limit=${limit}`;

    // console.log("HTAG SOLD SEARCH URL:", soldSearchUrl);

    const soldResponse = await fetch(soldSearchUrl, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    });

    const requestId = soldResponse.headers.get("x-amzn-requestid") || "";

    // console.log("REQUEST ID:", requestId);

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
      if (!creditResult || creditResult.length === 0) {
        // console.log(
        //   "NO CREDITS BALANCE RECORD FOUND. CREATING ONE..."
        // );

        const newCreditRow = await creditsTable.insertRow({
          OrgID: orgId,

          CreditsRemaining: Number(tenantRow?.CreditsLeft || 0),

          Total_Credits_Purchased: totalCreditsPurchased,

          Last_Credits_Consumed: 0,

          LastCreditUsageDate: "",
        });

        creditRow = newCreditRow;
      } else {
        creditRow = creditResult[0].CreditsBalance;
      }

      if (!apiTenantResult || apiTenantResult.length === 0) {
        throw new Error("No apiTenants record found for Org ID: " + orgId);
      }

      if (!tenantRow) {
        tenantRow = apiTenantResult[0].apiTenants;
      }

      if (!tenantRow) {
        throw new Error("No apiTenants record found for Org ID: " + orgId);
      }

      if (
        Number(creditRow.CreditsRemaining || 0) === 0 &&
        Number(tenantRow.CreditsLeft || 0) > 0
      ) {
        await creditsTable.updateRow({
          ROWID: creditRow.ROWID,
          CreditsRemaining: tenantRow.CreditsLeft,
          Total_Credits_Purchased: totalCreditsPurchased,
        });

        creditRow.CreditsRemaining = tenantRow.CreditsLeft;
        currentCredits = Number(tenantRow.CreditsLeft);
      }
      // console.log("CURRENT CREDITS BEFORE CHECK:", currentCredits);

      newBalance = Math.max(0, currentCredits - totalBillingUnits);

      // console.log(
      //   "CREDIT DEDUCTION:",
      //   currentCredits,
      //   "-",
      //   totalBillingUnits,
      //   "=",
      //   newBalance
      // );

      // console.log("FINAL TOTAL PURCHASED:", totalCreditsPurchased);

      await creditsTable.updateRow({
        ROWID: creditRow.ROWID,
        CreditsRemaining: newBalance,
        Total_Credits_Purchased: totalCreditsPurchased,
        Last_Credits_Consumed: totalBillingUnits,
        LastCreditUsageDate: new Date().toISOString().split("T")[0],
      });

      // console.log("UPDATING CREDITS BALANCE =>", {
      //   CreditsRemaining: newBalance,
      //   TotalCreditsPurchased: totalCreditsPurchased,
      //   LastCreditsConsumed: totalBillingUnits,
      // });
    } catch (creditUpdateError) {
      console.error("CREDIT UPDATE ERROR:", creditUpdateError);
    }

    let tenantCreditStatus = "Unknown";

    try {
      if (tenantRow) {
        if (newBalance <= 0) {
          tenantCreditStatus = "Exhausted";
        } else if (newBalance <= 20) {
          tenantCreditStatus = "Low Credits";
        } else {
          tenantCreditStatus = "Active";
=======
        body {
            background: #fff;
            color: #222;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
>>>>>>> 85cccbc (feat: integrate dynamic CRM fields and fix PDF page-break top margins)
        }

        /* Fixed Standard Page Container (for structured static pages) */
        .page {
            width: 100%;
            height: 297mm; /* Absolute standard A4 page height */
            max-height: 297mm;
            padding: 20mm 20mm; /* Generous, standard PDF safe zone margins */
            position: relative;
            box-sizing: border-box;
            overflow: hidden; /* Prevents stray elements from spilling onto next page */
        }

        /* Dynamic Page Container (specifically for the dynamic comparable rows list) */
        .dynamic-page {
            width: 100%;
            padding: 20mm 20mm;
            position: relative;
            box-sizing: border-box;
        }

        .cover-page {
            padding-top: 25mm;
        }

        .summary-page,
        .comparable-page,
        .estimation-page,
        .disclaimer-page {
            padding-top: 20mm;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 25px;
            margin-bottom: 25px;
            border: none;
        }

        .left {
            width: 70%;
        }

        .right {
            width: 25%;
            display: flex;
            justify-content: flex-end;
        }

        .logo {
            width: 180px;
            display: flex;
            justify-content: flex-end;
            align-items: flex-start;
        }

        .cover-image {
            width: 100%;
            height: 540px;
            margin-top: 25px;
        }

        .cover-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 8px;
            border: none;
        }

        .title {
            font-size: 20px;
            font-weight: 500;
            color: #505050;
            margin-top: 14px;
            margin-bottom: 18px;
        }

        .address {
            font-size: 18px;
            color: #555;
            margin-bottom: 25px;
        }

        .meta {
            font-size: 11px;
            line-height: 22px;
            color: #666;
        }

        .section {
            margin-top: 20px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            border-bottom: 1.5px solid #f0f0f0;
            padding-bottom: 10px;
            margin-bottom: 20px;
            letter-spacing: -0.2px;
        }

        .sales-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        /* Premium Summary Cards Styling */
        .summary-container {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            width: 100%;
            margin-top: 20px;
        }

        .summary-card-hero {
            width: 100%;
            height: 240px;
            background-size: cover;
            background-position: center;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            margin-bottom: 20px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            width: 100%;
        }

        .summary-card {
            background: #F8F9FA;
            border: 1px solid #E9ECEF;
            border-radius: 6px;
            padding: 16px;
            text-align: left;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .summary-card-label {
            font-size: 11px;
            color: #787B7E;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
        }

        .summary-card-value {
            font-size: 18px;
            color: #38424A;
            font-weight: 600;
        }

        .card {
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 15px;
            background: #fafafa;
        }

        .card-title {
            font-size: 12px;
            color: #777;
            margin-bottom: 8px;
        }

        .card-value {
            font-size: 20px;
            font-weight: 700;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        thead {
            background: #f5f5f5;
        }

        th {
            text-align: left;
            padding: 12px;
            border: 1px solid #e5e5e5;
            font-size: 13px;
        }

<<<<<<< HEAD
      res.end(
        JSON.stringify({
          error: "payment_required",
          message:
            "Oops! API credits exhausted. Please contact support@agenttime.au",
        })
      );
=======
        td {
            padding: 12px;
            border: 1px solid #e5e5e5;
            font-size: 13px;
        }
>>>>>>> 85cccbc (feat: integrate dynamic CRM fields and fix PDF page-break top margins)

        .footer {
            margin-top: 40px;
            border-top: 1px solid #ececec;
            padding-top: 18px;
            text-align: center;
            font-size: 11px;
            color: #777;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .disclaimer {
            font-size: 12px;
            line-height: 1.8;
            color: #666;
        }

        .disclaimer-section {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .property-hero {
            display: flex;
            gap: 35px;
            margin-top: 20px;
            margin-bottom: 25px;
            align-items: flex-start;
        }

        .hero-image {
            width: 260px;
            flex-shrink: 0;
        }

        .hero-image img {
            width: 100%;
            border-radius: 12px;
            border: 1px solid #e8e8e8;
            background: white;
            padding: 10px;
        }

        .hero-details {
            flex: 1;
        }

        .property-icons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 20px;
            width: 100%;
        }

        .icon-card {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            background: #f8f9fa;
            border: 1px solid #eef0f2;
            border-radius: 8px;
        }

        .icon-card img {
            width: 20px;
            height: 20px;
        }

        .icon-card span {
            font-size: 12px;
            font-weight: 600;
            color: #333;
        }

        .property-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .property-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13px;
            color: #444;
        }

        .property-table tr:hover td {
            background: #fafafa;
        }

        .property-table td:first-child {
            width: 160px;
            color: #777;
            font-weight: 500;
        }

        .sale-card {
            display: flex;
            gap: 24px;
            border: 1px solid #eef0f2;
            border-radius: 12px;
            padding: 20px;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            margin-bottom: 20px;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .sale-image {
            width: 170px;
            flex-shrink: 0;
        }

        .sale-image img {
            width: 100%;
            height: 130px;
            object-fit: contain;
            border-radius: 10px;
            border: 1px solid #ececec;
            padding: 12px;
            background: white;
        }

        .sale-content {
            flex: 1;
        }

        .sale-address {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #1a1a1a;
        }

        .sale-icons {
            display: flex;
            gap: 20px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .sale-icons div {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #444;
        }

        .sale-icons img {
            width: 16px;
            height: 16px;
        }

        .sale-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #ececec;
        }

        .sale-date {
            font-size: 13px;
            color: #777;
        }

        .sale-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .sale-type {
            font-size: 11px;
            font-weight: 600;
            color: #777;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .sale-price {
            font-size: 26px;
            font-weight: 700;
            color: #111;
        }

        /* Valuation Box specific styling */
        .estimation-box {
            background: #FAFAFA;
            border-left: 4px solid #38424A;
            padding: 25px;
            margin-top: 20px;
            border-radius: 4px;
        }

        .estimation-label {
            font-size: 11px;
            color: #787B7E;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 500;
            display: block;
            margin-bottom: 6px;
        }

        .estimation-value {
            font-size: 28px;
            margin: 10px 0;
            color: #38424A;
            font-weight: 700;
        }

        .estimation-text {
            font-size: 13px;
            line-height: 1.6;
            color: #4D4D4F;
            margin-top: 12px;
        }

        .insights-list {
            margin-top: 30px;
        }

        .insights-list h4 {
            font-size: 15px;
            color: #38424A;
            margin-bottom: 12px;
            font-weight: 600;
        }

        .insights-list ul {
            color: #4D4D4F;
            line-height: 1.7;
            padding-left: 20px;
            font-size: 13px;
        }

        .insights-list li {
            margin-bottom: 8px;
        }

        .report-footer {
            page-break-inside: avoid;
            break-inside: avoid;
            position: absolute;
            bottom: 20mm;
            left: 20mm;
            right: 20mm;
        }

        .page-break {
            page-break-after: always;
            break-after: page;
        }
    </style>
</head>

<body>

    <!-- ========================= -->
    <!-- PAGE 1: COVER PAGE -->
    <!-- ========================= -->
    <div class="page cover-page">
        <div class="header">
            <div class="left">
                <div style="font-size:14px; font-weight:700; color:#333; margin-bottom:12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Comparative Market Analysis Report
                </div>
                <div class="title" style="font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.25; margin-top: 10px; margin-bottom: 20px;">
                    {{PROPERTY_ADDRESS}}
                </div>
                <div class="meta" style="margin-top: 20px;">
                    <table style="width: auto; border-collapse: collapse; font-size: 12px; margin-top: 0;">
                        <tr>
                            <td style="border: none; padding: 4px 30px 4px 0; color: #777; font-weight: 500;">
                                Prepared On
                            </td>
                            <td style="border: none; padding: 4px 0; color: #222; font-weight: 600;">
                                {{GENERATED_DATE}}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 4px 30px 4px 0; color: #777; font-weight: 500;">
                                Prepared By
                            </td>
                            <td style="border: none; padding: 4px 0; color: #222; font-weight: 600;">
                                {{GENERATED_BY}}
                            </td>
                        </tr>
                        <tr>
                            <td style="border: none; padding: 4px 30px 4px 0; color: #777; font-weight: 500;">
                                Generated Using
                            </td>
                            <td style="border: none; padding: 4px 0; color: #222; font-weight: 600;">
                                Agent Time Buyers Agency Suite
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            <div class="right">
                <div class="logo">
                    <img src="assets/htag-logo.png" style="width:95px; height: auto;">
                </div>
            </div>
        </div>
        <div class="cover-image">
            <img src="assets/property-placeholder.png" alt="Property Cover Image">
        </div>
    </div>

    <div class="page-break"></div>

    <!-- ========================= -->
    <!-- PAGE 2: SUMMARY PAGE -->
    <!-- ========================= -->
    <div class="page summary-page">
        <div class="section">
            <div class="section-title">Property Summary</div>
            <div class="property-hero">
                <div class="hero-image">
                    <img src="assets/property-placeholder.png" alt="Property Thumbnail">
                </div>
                <div class="hero-details">
                    <div class="property-icons">
                        <div class="icon-card">
                            <img src="assets/bed.png" alt="Bed Icon">
                            <span>{{BEDROOMS}} Bedrooms</span>
                        </div>
                        <div class="icon-card">
                            <img src="assets/bath.png" alt="Bath Icon">
                            <span>{{BATHROOMS}} Bathrooms</span>
                        </div>
                        <div class="icon-card">
                            <img src="assets/car.png" alt="Car Icon">
                            <span>{{CAR_SPACES}} Car Spaces</span>
                        </div>
                        <div class="icon-card">
                            <img src="assets/land.png" alt="Land Icon">
                            <span>{{LAND_SIZE}} Sqm</span>
                        </div>
                    </div>
                    <table class="property-table">
                        <tr>
                            <td>Property Type</td>
                            <td>{{PROPERTY_TYPE}}</td>
                        </tr>
                        <tr>
                            <td>Year Built</td>
                            <td>{{YEAR_BUILT}}</td>
                        </tr>
                        <tr>
                            <td>Zone</td>
                            <td>{{ZONE}}</td>
                        </tr>
                        <tr>
                            <td>Radius Used</td>
                            <td>{{RADIUS}}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div class="page-break"></div>

    <!-- ========================= -->
    <!-- PAGE 3: RECENTLY SOLD PROPERTIES (DYNAMIC FLOW CONTAINER) -->
    <!-- ========================= -->
    <div class="dynamic-page comparable-page">
        <div class="section">
            <div class="section-title">Recently Sold Properties</div>
            <div class="sales-list">
                {{COMPARABLE_ROWS}}
            </div>
        </div>
    </div>

    <div class="page-break"></div>

    <!-- ========================= -->
    <!-- PAGE 4: ESTIMATED PROPERTY VALUE -->
    <!-- ========================= -->
    <div class="page estimation-page">
        <div class="section">
            <div class="section-title">Estimated Property Value</div>
            
            <div class="estimation-box">
                <span class="estimation-label">Estimated Price Range</span>
                <div class="estimation-value">{{MIN_ESTIMATED_VALUE}} - {{MAX_ESTIMATED_VALUE}}</div>
                <p class="estimation-text">
                    This automated estimated value represents our localized pricing analysis compiled using recent surrounding sales indices, historical trends, property configuration weighting, and general market velocity within the area.
                </p>
            </div>

            <div class="insights-list">
                <h4>Key Pricing Insights</h4>
                <ul>
                    <li>Calculated based on local transactions of similar scale, configuration, and structural layout within your chosen search radius.</li>
                    <li>Value index considers specific zoning variances, dynamic land-to-building ratios, and active buyer interest parameters across our platform database.</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="page-break"></div>

    <!-- ========================= -->
    <!-- FINAL PAGE: DISCLAIMER & FOOTER -->
    <!-- ========================= -->
    <div class="page disclaimer-page">
        <div class="report-footer">
            <div class="section disclaimer-section">
                <div class="section-title">Disclaimer</div>
                <div class="disclaimer">
                    This report has been generated using property data supplied by HTAG and information available within Agent Time Buyers Agency Suite. The information contained in this report is intended as a guide only and should not be relied upon as an independent valuation or legal advice. Users should undertake their own due diligence and seek professional advice before making any property or financial decisions.
                </div>
            </div>
            <div class="footer">
                Powered by <strong>Agent Time Buyers Agency Suite</strong> • Property Data by <strong>HTAG</strong>
            </div>
        </div>
    </div>

</body>

</html>