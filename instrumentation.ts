export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logger } = await import("@/src/lib/logger");

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled promise rejection (server)", {
        reason:
          reason instanceof Error
            ? { message: reason.message, stack: reason.stack }
            : String(reason),
      });
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception (server)", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        const { closeDatabase } = await import("@/db");
        closeDatabase();
        logger.info("Database closed successfully.");
      } catch (error) {
        logger.error("Error closing database", { error: String(error) });
      }
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}
