import { db } from "../db/index.js";
import { campaigns, campaign_history } from "../db/schema.js";
import stringSimilarity from "string-similarity";
import Fuse from "fuse.js";

async function campaignRoutes(fastify, options) {
  // GET all campaigns
  fastify.get("/campaigns", async (request, reply) => {
    try {
      const baseCampaigns = await db.selectDistinct({ name: campaigns.name }).from(campaigns);
      console.log("All campaigns:", baseCampaigns?.length);

      const campaignHistory = await db.selectDistinct({ name: campaign_history.name }).from(campaign_history)

      console.log("campaignHistory?.length", campaignHistory?.length);

      const mappingCampaignHistory = campaignHistory.reduce((acc, history) => {
        const isIdentical = baseCampaigns.some(campaign => campaign.name === history.name);
        acc[isIdentical ? 'identicalName' : 'nonIdenticalName'].push(history);
        return acc;
      }, { identicalName: [], nonIdenticalName: [] });
      
      console.log("Identical names:", mappingCampaignHistory.identicalName);
      console.log("Non-identical names:", mappingCampaignHistory.nonIdenticalName?.length);





      const stringSimilarityMatch = mappingCampaignHistory.nonIdenticalName.map((history) => {
        let bestMatch = null;

        baseCampaigns.forEach((campaign) => {
          const similarity = stringSimilarity.compareTwoStrings(campaign.name, history.name);

          if (similarity >= 0.50 && (!bestMatch || similarity > bestMatch.similarity)) {
            bestMatch = {
              history: history.name,
              campaign: campaign.name,
              similarity: (similarity * 100).toFixed(2)
            };
          }
        });

        return bestMatch;
      }).filter(Boolean); 

      const stringSimilarityMatched = stringSimilarityMatch.sort((a, b) => a.similarity - b.similarity);

      console.log("stringSimilarityMatched:", {stringSimilarityMatched}, stringSimilarityMatched?.length);



      const fuse = new Fuse(baseCampaigns, {
        keys: ['name'], 
        threshold: 0.50,
        includeScore: true
      });

      const results = mappingCampaignHistory.nonIdenticalName.map((history) => {
        const bestMatch = fuse.search(history.name).shift();

        if (bestMatch && bestMatch.score <= 0.50) {
          return {
            history: history.name,
            campaign: bestMatch.item.name,
            similarity: (100 - (bestMatch.score * 100)).toFixed(2) 
          };
        }

        return null; 
      }).filter(Boolean); 

      const sortedResults = results.sort((a, b) => a.similarity - b.similarity);

      console.log("fuse:", { sortedResults }, sortedResults?.length);
      return sortedResults;
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: "Database error" });
    }
  });
}

export default campaignRoutes;
