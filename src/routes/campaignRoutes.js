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

      console.log("Identical names:", mappingCampaignHistory.identicalName.length);
      console.log("Non-identical names:", mappingCampaignHistory.nonIdenticalName.length);

      console.time("string-similarity Approach");

      const similarityThreshold = 0.50;

      const stringSimilarityMatched = mappingCampaignHistory.nonIdenticalName
        .map((history) => {
          let bestMatch = { similarity: 0 };

          for (const campaign of baseCampaigns) {
            const similarity = stringSimilarity.compareTwoStrings(campaign.name, history.name);

            if (similarity < 0.2) continue;

            if (similarity > bestMatch.similarity) {
              bestMatch = { history: history.name, campaign: campaign.name, similarity };
            }
          }

          return bestMatch.similarity >= similarityThreshold
            ? { ...bestMatch, similarity: (bestMatch.similarity * 100).toFixed(2) }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.similarity - a.similarity);

      console.timeEnd("string-similarity Approach");


      console.log("Best matches (sorted by similarity):", stringSimilarityMatched?.length);


      console.time("fuse.js Approach");

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

      console.timeEnd("fuse.js Approach");


      console.log("fuse:", sortedResults?.length);
      return { sortedResults, stringSimilarityMatched };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: "Database error" });
    }
  });
}

export default campaignRoutes;
