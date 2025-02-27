import { db } from "../db/index.js";
import { campaigns,  campaign_history} from "../db/schema.js";

async function campaignRoutes(fastify, options) {
  // GET all campaigns
  fastify.get("/campaigns", async (request, reply) => {
    try {
      const getAllCampaigns = await db.selectDistinct({name: campaigns.name}).from(campaigns);
      console.log("All campaigns:", getAllCampaigns);
      const getAllCampaignHistory = await db.selectDistinct({ name: campaign_history.name }).from(campaign_history)
      console.log("All campaigns history:", getAllCampaignHistory);
      return getAllCampaignHistory;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: "Database error" });
    }
  });
}

export default campaignRoutes;
