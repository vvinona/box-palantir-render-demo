import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    "https://tektite-containers.palantirfoundry.com",
    "https://boxdemo.usw-16.palantirfoundry.com"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.status(200).send("Box to Palantir middleware is running.");
});

app.post(
  "/upload-to-box/:folderId",
  upload.single("file"),
  async (req, res) => {
    try {
      const { folderId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: "No file uploaded",
        });
      }

      const tokenResponse = await axios.post(
        "https://api.box.com/oauth2/token",
        new URLSearchParams({
          grant_type: "client_credentials",
          client_id: process.env.BOX_CLIENT_ID,
          client_secret: process.env.BOX_CLIENT_SECRET,
          box_subject_type: "enterprise",
          box_subject_id: process.env.BOX_ENTERPRISE_ID,
        }),
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

      const accessToken =
        tokenResponse.data.access_token;

      const formData = new FormData();

      formData.append(
        "attributes",
        JSON.stringify({
          name: req.file.originalname,
          parent: {
            id: folderId,
          },
        })
      );

      formData.append(
        "file",
        req.file.buffer,
        req.file.originalname
      );

      const uploadResponse = await axios.post(
  "https://upload.box.com/api/2.0/files/content",
  formData,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...formData.getHeaders(),
    },
  }
);

const uploadedFile = uploadResponse.data.entries[0];

console.log("Uploaded file:", uploadedFile.id);
await new Promise((resolve) => setTimeout(resolve, 5000));

const freshFileResponse = await axios.get(
  `https://api.box.com/2.0/files/${uploadedFile.id}`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      fields: "id,name,type,etag,sha1,modified_at",
    },
  }
);

const freshFile = freshFileResponse.data;

console.log("Fresh file retrieved:", freshFile.id);

const now = new Date();

const timestamp =
  String(now.getMonth() + 1).padStart(2, "0") +
  "." +
  String(now.getDate()).padStart(2, "0") +
  "." +
  now.getFullYear() +
  " " +
  String(now.getHours()).padStart(2, "0") +
  ":" +
  String(now.getMinutes()).padStart(2, "0") +
  ":" +
  String(now.getSeconds()).padStart(2, "0");

const aiResponse = await axios.post(
  "https://api.box.com/2.0/ai/ask",
  {
    mode: "single_item_qa",

    prompt:
      `You are a military mission intelligence analyst updating an operational mission record in a command system. Produce a concise operational update in plain text only. Do not use markdown, bullet points, headers, asterisks, or special formatting characters. Do not ask follow-up questions. Start the response EXACTLY with: "Updated ${timestamp}:". Then provide a concise operational update including key mission developments, risks/issues, operational relevance, and recommended follow-up actions in 1-2 short paragraphs. Keep the response executive-style and concise.`,

    items: [
      {
        id: freshFile.id,
        type: "file",
      },
    ],

    include_citations: true,

    ai_agent: {
      type: "ai_agent_ask",
    },
  },
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }
);

console.log("AI RESPONSE:");
console.log(JSON.stringify(aiResponse.data, null, 2));

const aiSummary =
  aiResponse.data.answer ||
  "No AI summary returned.";

return res.status(200).json({
  ok: true,
  file: uploadedFile,
  aiSummary
});

      return res.status(200).json({
        ok: true,
        file: uploadResponse.data.entries[0],
      });
    } catch (error) {
      console.error(error.response?.data || error);

      return res.status(500).json({
        ok: false,
        error:
          error.response?.data || error.message,
      });
    }
  }
);

app.post("/upload-to-box/:folderId", upload.single("file"), async (req, res) => {
  // uploads req.file to Box folderId
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

app.get("/create-mission-folder", async (req, res) => {

    try {

        console.log("Creating Box folder tree...");

        const tokenResponse = await axios.post(
            "https://api.box.com/oauth2/token",
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: process.env.BOX_CLIENT_ID,
                client_secret: process.env.BOX_CLIENT_SECRET,
                box_subject_type: "enterprise",
                box_subject_id: process.env.BOX_ENTERPRISE_ID
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        console.log("Box token acquired.");

        const missionName =
            req.query.missionName || `Mission-${Date.now()}`;

        const folderResponse = await axios.post(
            "https://api.box.com/2.0/folders",
            {
                name: missionName,
                parent: {
                    id: process.env.BOX_PARENT_FOLDER_ID
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const missionFolderId = folderResponse.data.id;

        console.log(`Mission folder created: ${missionFolderId}`);

        const subfolders = [
            "Reports",
            "Intelligence",
            "Imagery",
            "Communications",
            "Briefings",
            "AI Summaries"
        ];

        for (const subfolderName of subfolders) {

            await axios.post(
                "https://api.box.com/2.0/folders",
                {
                    name: subfolderName,
                    parent: {
                        id: missionFolderId
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log(`Created subfolder: ${subfolderName}`);
        }

        console.log("Creating shared link...");

        const sharedLinkResponse = await axios.put(
            `https://api.box.com/2.0/folders/${missionFolderId}`,
            {
                shared_link: {
                    access: "open"
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const sharedLink =
            sharedLinkResponse.data.shared_link.url;

        console.log(`Shared link created: ${sharedLink}`);

        const folderUrl = sharedLink;

        const embedUrl =
            sharedLink
            .replace("/s/", "/embed/s/")
            + "?sortColumn=date";

        return res.status(200).json({
            ok: true,
            missionName,
            missionFolderId,
            folderUrl,
            embedUrl
        });

    } catch (error) {

        console.error("Folder creation error:");

        if (error.response) {
            console.error(error.response.status);
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }

        return res.status(500).json({
            ok: false,
            error: error.response?.data || error.message
        });
    }
});
app.get("/get-box-token", async (req, res) => {
  try {
    console.log("Requesting Box token for UI Elements...");

    const tokenResponse = await axios.post(
      "https://api.box.com/oauth2/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.BOX_CLIENT_ID,
        client_secret: process.env.BOX_CLIENT_SECRET,
        box_subject_type: "enterprise",
        box_subject_id: process.env.BOX_ENTERPRISE_ID
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    return res.status(200).json({
      accessToken: tokenResponse.data.access_token,
      expiresIn: tokenResponse.data.expires_in
    });

  } catch (error) {

    console.error("Token route error:");

    if (error.response) {
      console.error(error.response.status);
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }

    return res.status(500).json({
      ok: false,
      error: error.response?.data || error.message
    });
  }
});
app.get("/box-folder-items/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;

    const tokenResponse = await axios.post(
      "https://api.box.com/oauth2/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.BOX_CLIENT_ID,
        client_secret: process.env.BOX_CLIENT_SECRET,
        box_subject_type: "enterprise",
        box_subject_id: process.env.BOX_ENTERPRISE_ID
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const itemsResponse = await axios.get(
      `https://api.box.com/2.0/folders/${folderId}/items`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          fields: "id,type,name,size,created_at,modified_at,shared_link"
        }
      }
    );

    const items = itemsResponse.data.entries.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      size: item.size,
      createdAt: item.created_at,
      modifiedAt: item.modified_at,
      boxUrl:
        item.type === "folder"
          ? `https://app.box.com/folder/${item.id}`
          : `https://app.box.com/file/${item.id}`
    }));

    return res.status(200).json({ ok: true, folderId, items });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.response?.data || error.message
    });
  }
});
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
