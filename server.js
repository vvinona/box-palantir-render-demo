import express from "express";
import dotenv from "dotenv";

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
      boxItemId,
      boxItemName: req.body.box_item_name || "unknown",
      companyName: req.body.company_name || "Unknown",
      constellationSize: req.body.constellation_size || "N/A",
      geographicCoverage: req.body.geographic_coverage || "Unknown",
      orbitType: req.body.orbit_type || "Unknown",
      dataLatency: req.body.data_latency || "Unknown",
      integrationMethod: req.body.integration_method || "Unknown",
      capabilityCategory: req.body.capability_category || "Unknown",
      boxUrl: `https://app.box.com/file/${boxItemId}`,
      lastSyncedAt: new Date().toISOString(),
      sourceSystem: "Box"
    };

    console.log("Normalized Palantir payload:");
    console.log(JSON.stringify(normalizedPayload, null, 2));

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("Middleware error:", error);

    return res.status(200).json({
      ok: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
