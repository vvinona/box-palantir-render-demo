import express from "express";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("Box to Palantir middleware is running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/box-to-palantir", async (req, res) => {
  try {

    console.log("Incoming Box payload:");
    console.log(JSON.stringify(req.body, null, 2));

    const boxItemId = req.body.box_item_id || "unknown";

    const normalizedPayload = {
      companyName: req.body.company_name || "Unknown",
      capabilityCategory: req.body.capability_category || "Unknown",
      orbitType: req.body.orbit_type || "Unknown",
      geographicCoverage: req.body.geographic_coverage || "Unknown",
      dataLatency: req.body.data_latency || "Unknown",
      integrationMethod: req.body.integration_method || "Unknown",
      boxitemId: boxItemId,
      boxUrl: `https://app.box.com/file/${boxItemId}`
    };

    console.log("Normalized Palantir payload:");
    console.log(JSON.stringify(normalizedPayload, null, 2));

    console.log("Requesting Palantir token...");

    const tokenResponse = await axios.post(
      process.env.PALANTIR_TOKEN_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.PALANTIR_CLIENT_ID,
        client_secret: process.env.PALANTIR_CLIENT_SECRET
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    console.log("Palantir token acquired.");

    const foundryResponse = await axios.post(
      `${process.env.PALANTIR_BASE_URL}/api/v2/ontology/objects/CommercialSpaceCapability`,
      normalizedPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Foundry response:");
    console.log(foundryResponse.data);

    return res.status(200).json({
      ok: true,
      foundry: foundryResponse.data
    });

  } catch (error) {

    console.error("Middleware error:");

    if (error.response) {
      console.error(error.response.status);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }

    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
