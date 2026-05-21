import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Box → Palantir middleware is running.");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

app.post("/box-to-palantir", async (req, res) => {
  try {

    console.log("Incoming payload:");
    console.log(JSON.stringify(req.body, null, 2));

    const normalizedPayload = {
      boxItemId: req.body.box_item_id || "unknown",
      boxItemName: req.body.box_item_name || "unknown",
      companyName: req.body.company_name || "Unknown",
      capabilityCategory: req.body.capability_category || "Unknown",
      orbitType: req.body.orbit_type || "Unknown",
      geographicCoverage: req.body.geographic_coverage || "Unknown",
      dataLatency: req.body.data_latency || "Unknown",
      integrationMethod: req.body.integration_method || "Unknown",
      boxUrl: req.body.box_url || null,
      lastSyncedAt: new Date().toISOString(),
      sourceSystem: "Box"
    };

    console.log("Normalized payload:");
    console.log(JSON.stringify(normalizedPayload, null, 2));

    return res.status(200).json({
      status: "success",
      normalizedPayload
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
