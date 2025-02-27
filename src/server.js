import Fastify from "fastify";
import campaignRoutes from "./routes/campaignRoutes.js";

const fastify = Fastify({ logger: true });

// Register routes
fastify.register(campaignRoutes);

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 5005, host: "0.0.0.0" });
    console.log(`🚀 Server running at http://localhost:5005`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
